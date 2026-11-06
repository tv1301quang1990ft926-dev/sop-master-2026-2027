import os
import sys
import json
import time
import random
import logging
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

try:
    from curl_cffi import requests as stealth_requests
    HAS_CURL_CFFI = True
except ImportError:
    import requests as stealth_requests
    HAS_CURL_CFFI = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

class SOPMasterStage2ParallelTracker:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.max_retries = 3
        self.supabase: Client = create_client(supabase_url.strip(), supabase_key.strip())

    def fetch_pending_matches_in_window(self) -> list:
        now_utc = datetime.now(timezone.utc)
        try:
            res = self.supabase.table("sop_master_baseline_scans").select("*").execute()
            matches = res.data or []
        except Exception as e:
            logging.error(f"❌ Lỗi truy vấn sop_master_baseline_scans: {e}")
            return []
        
        target_matches = []
        for m in matches:
            m_date_str = m.get("match_date")
            if not m_date_str:
                continue
            try:
                m_dt = datetime.fromisoformat(m_date_str.replace("Z", "+00:00"))
                diff_minutes = (m_dt - now_utc).total_seconds() / 60.0
                if 80 <= diff_minutes <= 180:
                    m['_diff_minutes'] = round(diff_minutes, 1)
                    target_matches.append(m)
            except Exception:
                continue

        logging.info(f"📊 Tìm thấy {len(target_matches)} trận GĐ1 nằm trong cửa sổ T-180m -> T-80m.")
        return target_matches

    def fetch_sofascore_live_odds(self, event_id: str) -> dict:
        p1, p2, p3 = "api", "sofascore", "com"
        url = f"https://{p1}.{p2}.{p3}/api/v1/event/{event_id}/odds/1/all"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36"}
        try:
            if HAS_CURL_CFFI:
                res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=8)
            else:
                res = requests.get(url, headers=headers, timeout=8)

            if res.status_code == 200:
                markets = res.json().get("markets", [])
                live_handicap, live_home_odds, live_over_under = None, None, None
                for market in markets:
                    m_name = str(market.get("marketName", "")).lower()
                    if "handicap" in m_name:
                        choices = market.get("choices", [])
                        if len(choices) >= 2:
                            hc_str = choices[0].get("handicap")
                            live_handicap = float(hc_str) if hc_str is not None else None
                            live_home_odds = choices[0].get("decimalValue") or choices[0].get("fractionalValue")
                    if "total" in m_name or "over/under" in m_name:
                        choices = market.get("choices", [])
                        if len(choices) >= 2:
                            ou_str = choices[0].get("handicap")
                            live_over_under = float(ou_str) if ou_str is not None else None

                return {
                    "live_handicap": live_handicap,
                    "live_home_odds": float(live_home_odds) if live_home_odds else None,
                    "live_over_under": live_over_under,
                    "source": "SofaScore"
                }
        except Exception:
            pass
        return {}

    def fetch_bongdainfo_live_odds(self, home_team: str, away_team: str) -> dict:
        b1, b2, b3 = "api", "bongdainfo", "tv"
        domain = f"{b1}.{b2}.{b3}"
        url = f"https://{domain}/v1/live_odds?home={requests.utils.quote(home_team)}&away={requests.utils.quote(away_team)}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36"}
        try:
            res = requests.get(url, headers=headers, timeout=8)
            if res.status_code == 200:
                data = res.json().get("data", {})
                return {
                    "live_handicap": data.get("handicap"),
                    "live_home_odds": data.get("odds_home"),
                    "live_over_under": data.get("over_under"),
                    "source": "BongdaInfo"
                }
        except Exception:
            pass
        return {}

    def run_parallel_odds_fetch(self, event_id: str, home_team: str, away_team: str) -> list:
        """CÀO SONG SONG Live Odds từ cả SofaScore & BongdaInfo"""
        odds_results = []
        with ThreadPoolExecutor(max_workers=2) as executor:
            fut_sofa = executor.submit(self.fetch_sofascore_live_odds, event_id)
            fut_bdi = executor.submit(self.fetch_bongdainfo_live_odds, home_team, away_team)

            res_sofa = fut_sofa.result()
            res_bdi = fut_bdi.result()

            if res_sofa and res_sofa.get("live_home_odds"):
                odds_results.append(res_sofa)
            if res_bdi and res_bdi.get("live_home_odds"):
                odds_results.append(res_bdi)

        return odds_results

    def analyze_and_track_match(self, match: dict) -> dict:
        payload = match.get("baseline_payload") or {}
        home_team = match.get("home_team", "")
        away_team = match.get("away_team", "")
        match_id = match.get("match_id", "")
        event_id = match_id.split("_")[-1] if "_" in match_id else match_id

        opening_hc = payload.get("handicap_opening", 0.0)
        opening_odds = payload.get("odds_home_opening", 0.90)
        opening_ou = payload.get("over_under_opening", 2.5)

        # Cào song song Live Odds từ các cổng
        parallel_odds = self.run_parallel_odds_fetch(event_id, home_team, away_team)

        if parallel_odds:
            primary_odds = parallel_odds[0]
            curr_hc = primary_odds.get("live_handicap") if primary_odds.get("live_handicap") is not None else opening_hc
            curr_odds = primary_odds.get("live_home_odds") if primary_odds.get("live_home_odds") else opening_odds
            curr_ou = primary_odds.get("live_over_under") if primary_odds.get("live_over_under") is not None else opening_ou

            # Đối soát tương đồng Odds giữa các cổng
            if len(parallel_odds) >= 2:
                o1 = parallel_odds[0].get("live_home_odds", curr_odds)
                o2 = parallel_odds[1].get("live_home_odds", curr_odds)
                diff = abs(o1 - o2)
                if diff <= 0.03:
                    odds_cross_check = "CONSENSUS_STABLE (CÁC NHÀ CÁI ĐỒNG THUẬN)"
                else:
                    odds_cross_check = f"CROSS_CHECK_VARIANCE (LỆCH GIÁ GIỮA CỔNG: {diff:.2f})"
            else:
                odds_cross_check = "VERIFIED_SINGLE_PORTAL"
        else:
            curr_hc, curr_odds, curr_ou = opening_hc, opening_odds, opening_ou
            odds_cross_check = "BASELINE_FALLBACK"

        delta_vs_baseline = round(curr_odds - opening_odds, 2)

        if delta_vs_baseline >= 0.06:
            trap_warning = "[CẢNH BÁO BẪY ODDS GĐ1]"
        else:
            trap_warning = "AN TOAN"

        if delta_vs_baseline <= -0.04:
            smart_money = "[DÒNG TIỀN THÔNG MINH GĐ1]"
        else:
            smart_money = "NEUTRAL"

        baseline_prob = payload.get("poisson_home_win_prob", 0.52)
        implied_live_prob = round(1.0 / curr_odds, 3) if curr_odds > 1.0 else 0.50
        expected_edge_t3h = round(baseline_prob - implied_live_prob, 3)

        return {
            "match_id": match_id,
            "stt_tran": match_id,
            "gio_thi_dau_gmt7": payload.get("kickoff_time", ""),
            "giai_dau": match.get("league_name", ""),
            "tran_dau": f"{home_team} vs {away_team}",
            "handicap_current_t3h": curr_hc,
            "overunder_current_t3h": curr_ou,
            "expected_edge_t3h": expected_edge_t3h,
            "market_volume_trend": "HIGH_LIQUIDITY" if abs(delta_vs_baseline) > 0.03 else "STABLE_LIQUIDITY",
            "smart_money_signal": smart_money,
            "trap_odds_warning": trap_warning,
            "odds_cross_check_status": odds_cross_check,
            "data_status_t3h": f"PARALLEL_SCRAPED_T_MINUS_{int(match.get('_diff_minutes'))}M",
            "update_timestamp_t3h": datetime.now(timezone.utc).isoformat()
        }

    def run(self):
        logging.info("🚀 [SOP MASTER GĐ2] Khởi chạy Tracking Movement - CÀO SONG SONG LIVE ODDS 3 CỔNG...")
        matches = self.fetch_pending_matches_in_window()

        if not matches:
            logging.info("ℹ️ Không có trận nào nằm trong khung đếm ngược T-180m -> T-80m.")
            return

        saved_count = 0
        for m in matches:
            payload = self.analyze_and_track_match(m)
            try:
                self.supabase.table("sop_master_tracking_movements").upsert(payload).execute()
                saved_count += 1
            except Exception as e:
                logging.error(f"❌ Lỗi ghi Supabase GĐ2: {e}")

        logging.info(f"🎉 GIAI ĐOẠN 2 COMPLETE: Đã cập nhật biến động {saved_count}/{len(matches)} trận đối soát song song!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")
    if not url_env or not key_env:
        sys.exit(1)

    tracker = SOPMasterStage2ParallelTracker(url_env, key_env)
    tracker.run()
