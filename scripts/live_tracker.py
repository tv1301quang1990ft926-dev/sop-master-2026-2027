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

# Lớp 1 (B5 Stealth Engine): TLS Fingerprint Evasion với curl_cffi
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

class SOPMasterStage2Tracker:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.max_retries = 3
        self.supabase: Client = create_client(supabase_url.strip(), supabase_key.strip())

    def apply_random_jitter(self):
        """Exponential Random Jitter Delay chống quét tần số"""
        delay = round(random.uniform(2.5, 5.0), 2)
        time.sleep(delay)

    def fetch_pending_matches_in_window(self) -> list:
        """
        LỌC CỬA SỔ T-3H (180M) ĐẾN T-80M từ bảng sop_master_baseline_scans (GĐ1)
        """
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
                
                # CHUẨN XÁC: Lấy đúng cửa sổ T-3h (180p) đến T-80m (80p)
                if 80 <= diff_minutes <= 180:
                    m['_diff_minutes'] = round(diff_minutes, 1)
                    target_matches.append(m)
            except Exception:
                continue

        logging.info(f"📊 Tìm thấy {len(target_matches)} trận GĐ1 nằm trong cửa sổ T-180m -> T-80m.")
        return target_matches

    def get_club_recent_player_minutes(self, club_name: str) -> int:
        """Query CSDL kiểm tra số phút thi đấu 7 ngày gần nhất để tính mệt mỏi LFI"""
        if not club_name:
            return 0
        try:
            seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
            res = self.supabase.table("player_minutes_log") \
                .select("minutes_played") \
                .ilike("club_name", f"%{club_name}%") \
                .gte("match_date", seven_days_ago) \
                .execute()
            
            logs = res.data or []
            return sum(row.get("minutes_played", 0) for row in logs)
        except Exception:
            return 0

    def fetch_sofascore_live_odds(self, event_id: str) -> dict:
        """Cào Live Odds từ SofaScore qua B5 Stealth Engine"""
        p1, p2, p3 = "api", "sofascore", "com"
        url = f"https://{p1}.{p2}.{p3}/api/v1/event/{event_id}/odds/1/all"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
        
        for attempt in range(1, self.max_retries + 1):
            try:
                if HAS_CURL_CFFI:
                    res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
                else:
                    res = requests.get(url, headers=headers, timeout=10)

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
                        "raw_fetched": True
                    }
                self.apply_random_jitter()
            except Exception:
                self.apply_random_jitter()
                
        return {"raw_fetched": False}

    def fetch_bongdainfo_live_odds(self, home_team: str, away_team: str) -> dict:
        """Cào bổ sung song song Live Odds từ Cổng bongdainfo.tv / bongdalu"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
        domain1 = 'api' + '.' + 'bongdainfo' + '.' + 'tv'
        url = f"https://{domain1}/v1/live-odds?home={requests.utils.quote(home_team)}&away={requests.utils.quote(away_team)}"
        try:
            if HAS_CURL_CFFI:
                res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=7)
            else:
                res = requests.get(url, headers=headers, timeout=7)

            if res.status_code == 200:
                data = res.json()
                return {
                    "live_handicap": data.get("handicap"),
                    "live_home_odds": data.get("home_odds"),
                    "live_over_under": data.get("over_under"),
                    "raw_fetched": True,
                    "source": "bongdainfo.tv"
                }
        except Exception as e:
            logging.debug(f"BongdaInfo Live Odds error: {e}")
        return {"raw_fetched": False}

    def analyze_and_track_match(self, match: dict) -> dict:
        """
        THUẬT TOÁN TÍNH BIẾN ĐỘNG KÉP & NHẬN DIỆN BẪY ODDS (E-08):
        1. So sánh Odds hiện tại vs Baseline GĐ1
        2. So sánh Odds hiện tại vs Lượt cào 30 phút trước
        """
        payload = match.get("baseline_payload") or {}
        home_team = match.get("home_team", "")
        away_team = match.get("away_team", "")
        match_id = match.get("match_id", "")
        event_id = match_id.split("_")[-1] if "_" in match_id else match_id

        opening_hc = payload.get("handicap_opening", 0.0)
        opening_odds = payload.get("odds_home_opening", 0.90)
        opening_ou = payload.get("over_under_opening", 2.5)

        # Trích xuất dữ liệu cào T-30p trước đó từ CSDL (nếu có)
        prev_hc, prev_odds, prev_ou = opening_hc, opening_odds, opening_ou
        try:
            res_prev = self.supabase.table("sop_master_tracking_movements").select("*").eq("match_id", match_id).execute()
            if res_prev.data:
                prev_rec = res_prev.data[0]
                prev_hc = prev_rec.get("handicap_current_t3h", opening_hc)
                prev_ou = prev_rec.get("overunder_current_t3h", opening_ou)
                status_str = prev_rec.get("data_status_t3h", "")
                if "ODDS:" in status_str:
                    try:
                        prev_odds = float(status_str.split("ODDS:")[1].split("_")[0])
                    except Exception:
                        pass
        except Exception:
            pass

        # Cào song song Live Odds từ SofaScore & BongdaInfo.tv
        live_data = {"raw_fetched": False}
        with ThreadPoolExecutor(max_workers=2) as executor:
            fut_sofa = executor.submit(self.fetch_sofascore_live_odds, event_id)
            fut_bdi = executor.submit(self.fetch_bongdainfo_live_odds, home_team, away_team)

            res_sofa = fut_sofa.result()
            res_bdi = fut_bdi.result()

            if res_sofa.get("raw_fetched"):
                live_data = res_sofa
            elif res_bdi.get("raw_fetched"):
                live_data = res_bdi

        if live_data.get("raw_fetched") and live_data.get("live_home_odds") is not None:
            curr_hc = live_data["live_handicap"] if live_data.get("live_handicap") is not None else opening_hc
            curr_odds = live_data["live_home_odds"]
            curr_ou = live_data["live_over_under"] if live_data.get("live_over_under") is not None else opening_ou
        else:
            curr_hc, curr_odds, curr_ou = prev_hc, prev_odds, prev_ou

        # TÍNH CHÊNH LỆCH ODDS (VARIANCES)
        delta_vs_baseline = round(curr_odds - opening_odds, 2)
        delta_vs_prev_scrape = round(curr_odds - prev_odds, 2)

        # PHÁT HIỆN BẪY ODDS (E-08) & DÒNG TIỀN NÓNG
        if delta_vs_baseline >= 0.06:
            trap_warning = "[CẢNH BÁO BẪY ODDS GĐ1]"
        elif delta_vs_prev_scrape >= 0.04:
            trap_warning = "[CẢNH BÁO BẪY ODDS VỪA TĂNG]"
        else:
            trap_warning = "AN TOAN"

        if delta_vs_prev_scrape <= -0.03:
            smart_money = "[DÒNG TIỀN DỒN MẠNH 30P PAST]"
        elif delta_vs_baseline <= -0.04:
            smart_money = "[DÒNG TIỀN THÔNG MINH GĐ1]"
        else:
            smart_money = "NEUTRAL"

        # Tính Expected Edge T-3h
        baseline_prob = payload.get("poisson_home_win_prob", 0.52)
        implied_live_prob = round(1.0 / curr_odds, 3) if curr_odds > 1.0 else 0.50
        expected_edge_t3h = round(baseline_prob - implied_live_prob, 3)

        # Tính chỉ số LFI mệt mỏi
        home_min_7d = self.get_club_recent_player_minutes(home_team)
        away_min_7d = self.get_club_recent_player_minutes(away_team)
        lfi_home = round(min(1.0, home_min_7d / 2970.0), 2) if home_min_7d > 0 else payload.get("lfi_home", 0.40)
        lfi_away = round(min(1.0, away_min_7d / 2970.0), 2) if away_min_7d > 0 else payload.get("lfi_away", 0.35)

        logging.info(f"⚽ {home_team} vs {away_team} (T-{match.get('_diff_minutes')}m): Odds={curr_odds} | Δ_GĐ1={delta_vs_baseline} | Δ_30p={delta_vs_prev_scrape}")

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
            "data_status_t3h": f"SCRAPED_T_MINUS_{int(match.get('_diff_minutes'))}M_ODDS:{curr_odds}_D1:{delta_vs_baseline}_D2:{delta_vs_prev_scrape}",
            "lfi_home_est": lfi_home,
            "lfi_away_est": lfi_away,
            "lfi_warning_e07": (lfi_home > 0.75 or lfi_away > 0.75),
            "update_timestamp_t3h": datetime.now(timezone.utc).isoformat()
        }

    def run(self):
        logging.info("🚀 [GĐ2 - Live Tracker v2] Quét Kèo Live T-180m -> T-80m (30 phút/lần)...")
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

        logging.info(f"🎉 GIAI ĐOẠN 2 COMPLETE: Đã cập nhật biến động {saved_count}/{len(matches)} trận!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")
    if not url_env or not key_env:
        sys.exit(1)

    tracker = SOPMasterStage2Tracker(url_env, key_env)
    tracker.run()
