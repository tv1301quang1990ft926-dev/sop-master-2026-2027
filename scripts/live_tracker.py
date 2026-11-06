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

def get_stealth_headers():
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    ]
    return {
        "User-Agent": random.choice(user_agents),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24"'
    }

class SOPMasterStage2Tracker:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.max_retries = 3
        self.supabase: Client = create_client(supabase_url.strip(), supabase_key.strip())

    def apply_random_jitter(self, min_s=2.5, max_s=5.0):
        time.sleep(round(random.uniform(min_s, max_s), 2))

    def fetch_pending_matches_in_window(self) -> list:
        now_utc = datetime.now(timezone.utc)
        try:
            res = self.supabase.table("sop_master_baseline_scans").select("*").execute()
            matches = res.data or []
        except Exception as e:
            logging.error(f"❌ Lỗi truy vấn sop_master_baseline_scans: {e}")
            return []
        
        target = []
        for m in matches:
            m_date_str = m.get("match_date")
            if not m_date_str: continue
            try:
                m_dt = datetime.fromisoformat(m_date_str.replace("Z", "+00:00"))
                diff_m = (m_dt - now_utc).total_seconds() / 60.0
                if 80 <= diff_m <= 180:
                    m['_diff_minutes'] = round(diff_m, 1)
                    target.append(m)
            except Exception:
                continue
        return target

    def fetch_sofascore_live_odds(self, event_id: str) -> dict:
        s1, s2, s3 = "api", "sofascore", "com"
        url = f"https://{s1}.{s2}.{s3}/api/v1/event/{event_id}/odds/1/all"
        headers = get_stealth_headers()
        try:
            res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=8) if HAS_CURL_CFFI else requests.get(url, headers=headers, timeout=8)
            if res.status_code == 200:
                markets = res.json().get("markets", [])
                live_hc, live_home, live_ou = None, None, None
                for m in markets:
                    m_name = str(m.get("marketName", "")).lower()
                    if "handicap" in m_name:
                        choices = m.get("choices", [])
                        if len(choices) >= 2:
                            live_hc = float(choices[0].get("handicap")) if choices[0].get("handicap") is not None else None
                            live_home = choices[0].get("decimalValue")
                    if "total" in m_name or "over/under" in m_name:
                        choices = m.get("choices", [])
                        if len(choices) >= 2:
                            live_ou = float(choices[0].get("handicap")) if choices[0].get("handicap") is not None else None
                return {"live_handicap": live_hc, "live_home_odds": float(live_home) if live_home else None, "live_over_under": live_ou, "source": "SofaScore"}
        except Exception:
            pass
        return {}

    def fetch_bongdainfo_live_odds(self, home_team: str, away_team: str) -> dict:
        b1, b2, b3 = "api", "bongdainfo", "tv"
        url = f"https://{b1}.{b2}.{b3}/v1/live-odds?home={requests.utils.quote(home_team)}&away={requests.utils.quote(away_team)}"
        headers = get_stealth_headers()
        try:
            res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=7) if HAS_CURL_CFFI else requests.get(url, headers=headers, timeout=7)
            if res.status_code == 200:
                data = res.json()
                return {"live_handicap": data.get("handicap"), "live_home_odds": data.get("home_odds"), "live_over_under": data.get("over_under"), "source": "BongdaInfo"}
        except Exception:
            pass
        return {}

    def fetch_livescore_live_odds(self, home_team: str, away_team: str) -> dict:
        l1, l2, l3 = "prod-public-api", "livescore", "com"
        url = f"https://{l1}.{l2}.{l3}/v1/api/app/odds/soccer?home={requests.utils.quote(home_team)}&away={requests.utils.quote(away_team)}"
        headers = get_stealth_headers()
        try:
            res = requests.get(url, headers=headers, timeout=7)
            if res.status_code == 200:
                d = res.json()
                return {"live_handicap": d.get("handicap"), "live_home_odds": d.get("home_odds"), "live_over_under": d.get("over_under"), "source": "LiveScore"}
        except Exception:
            pass
        return {}

    def run_parallel_odds_fetch(self, event_id: str, home_team: str, away_team: str) -> list:
        results = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            f1 = executor.submit(self.fetch_sofascore_live_odds, event_id)
            f2 = executor.submit(self.fetch_bongdainfo_live_odds, home_team, away_team)
            f3 = executor.submit(self.fetch_livescore_live_odds, home_team, away_team)

            for f in [f1, f2, f3]:
                res = f.result()
                if res and res.get("live_home_odds"):
                    results.append(res)
        return results

    def analyze_and_track_match(self, match: dict) -> dict:
        payload = match.get("baseline_payload") or {}
        home = match.get("home_team", "")
        away = match.get("away_team", "")
        match_id = match.get("match_id", "")
        event_id = match_id.split("_")[-1] if "_" in match_id else match_id

        opening_hc = payload.get("handicap_opening", 0.0)
        opening_odds = payload.get("odds_home_opening", 0.90)
        opening_ou = payload.get("over_under_opening", 2.5)

        parallel_odds = self.run_parallel_odds_fetch(event_id, home, away)
        if parallel_odds:
            primary = parallel_odds[0]
            curr_hc = primary.get("live_handicap") if primary.get("live_handicap") is not None else opening_hc
            curr_odds = primary.get("live_home_odds") if primary.get("live_home_odds") else opening_odds
            curr_ou = primary.get("live_over_under") if primary.get("live_over_under") is not None else opening_ou
            sources = [p.get("source") for p in parallel_odds]
        else:
            curr_hc, curr_odds, curr_ou = opening_hc, opening_odds, opening_ou
            sources = ["Baseline"]

        delta_vs_baseline = round(curr_odds - opening_odds, 2)
        trap_warning = "[CẢNH BÁO BẪY ODDS GĐ1]" if delta_vs_baseline >= 0.06 else "AN TOAN"
        smart_money = "[DÒNG TIỀN THÔNG MINH GĐ1]" if delta_vs_baseline <= -0.04 else "NEUTRAL"

        baseline_prob = payload.get("poisson_home_win_prob", 0.52)
        implied_live_prob = round(1.0 / curr_odds, 3) if curr_odds > 1.0 else 0.50
        expected_edge = round(baseline_prob - implied_live_prob, 3)

        return {
            "match_id": match_id,
            "gio_thi_dau_gmt7": payload.get("kickoff_time", ""),
            "giai_dau": match.get("league_name", ""),
            "tran_dau": f"{home} vs {away}",
            "handicap_current_t3h": curr_hc,
            "overunder_current_t3h": curr_ou,
            "expected_edge_t3h": expected_edge,
            "smart_money_signal": smart_money,
            "trap_odds_warning": trap_warning,
            "sources_verified": sources,
            "update_timestamp_t3h": datetime.now(timezone.utc).isoformat()
        }

    def run(self):
        logging.info("🚀 [SOP MASTER v5] Stage 2 Parallel Live Odds Tracker...")
        matches = self.fetch_pending_matches_in_window()
        if not matches:
            logging.info("ℹ️ Không có trận nào trong khung T-180m -> T-80m.")
            return

        saved_count = 0
        for m in matches:
            payload = self.analyze_and_track_match(m)
            try:
                self.supabase.table("sop_master_tracking_movements").upsert(payload).execute()
                saved_count += 1
            except Exception as e:
                logging.error(f"❌ Supabase Error GĐ2: {e}")

        logging.info(f"🎉 GĐ2 v5 COMPLETED: Đã cập nhật biến động {saved_count}/{len(matches)} trận!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")
    if not url_env or not key_env:
        sys.exit(1)
    tracker = SOPMasterStage2Tracker(url_env, key_env)
    tracker.run()
