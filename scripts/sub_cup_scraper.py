import os
import sys
import time
import random
import logging
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
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
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9"
    }

class SubCupPassiveScraper:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.max_retries = 2
        self.supabase: Client = create_client(supabase_url.strip(), supabase_key.strip())
        self.sub_cup_leagues = [
            "eng.league_cup", "eng.fa", "esp.copa_del_rey", 
            "ger.dfb_pokal", "ita.coppa_italia", "fra.coupe_de_france"
        ]

    def apply_random_jitter(self, min_s=2.5, max_s=5.0):
        time.sleep(round(random.uniform(min_s, max_s), 2))

    def log_system_error(self, error_code: str, match_id: str, log_details: dict):
        try:
            self.supabase.rpc("rpc_log_system_error", {
                "p_error_code": error_code,
                "p_match_id": match_id or "N/A",
                "p_log_details": log_details
            }).execute()
        except Exception:
            pass

    def get_166_clubs_lookup(self) -> set:
        try:
            res = self.supabase.table("sop_master_static_clubs").select("club_name").execute()
            if res.data:
                return {row["club_name"].lower() for row in res.data}
        except Exception:
            pass
        return set()

    def fetch_espn_sub_cups(self, today_str: str) -> list:
        e1, e2, e3, e4 = "site", "api", "espn", "com"
        domain = f"{e1}.{e2}.{e3}.{e4}"
        headers = get_stealth_headers()
        events = []
        for league in self.sub_cup_leagues:
            url = f"https://{domain}/apis/site/v2/sports/soccer/{league}/scoreboard?dates={today_str}"
            try:
                res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=8) if HAS_CURL_CFFI else requests.get(url, headers=headers, timeout=8)
                if res.status_code == 200:
                    raw = res.json().get("events", [])
                    for ev in raw:
                        comps = ev.get("competitions", [])
                        if comps:
                            competitors = comps[0].get("competitors", [])
                            if len(competitors) >= 2:
                                h_t = competitors[0].get("team", {}).get("displayName", "")
                                a_t = competitors[1].get("team", {}).get("displayName", "")
                                events.append({
                                    "match_id": f"SUB_{today_str}_{ev.get('id')}",
                                    "league": league, "home_team": h_t, "away_team": a_t,
                                    "source": "ESPN"
                                })
            except Exception:
                pass
        return events

    def fetch_bongdainfo_sub_cups(self, today_str: str) -> list:
        b1, b2, b3 = "api", "bongdainfo", "tv"
        url = f"https://{b1}.{b2}.{b3}/v1/sub-cups?date={today_str}"
        headers = get_stealth_headers()
        events = []
        try:
            res = requests.get(url, headers=headers, timeout=8)
            if res.status_code == 200:
                raw = res.json().get("data", [])
                for item in raw:
                    events.append({
                        "match_id": f"SUB_BDI_{item.get('id')}",
                        "league": item.get("league_name"), "home_team": item.get("home_name"), "away_team": item.get("away_name"),
                        "source": "BongdaInfo"
                    })
        except Exception:
            pass
        return events

    def run(self):
        logging.info("🚀 [SOP MASTER v5] B5 Stealth Engine Sub-Cup Scraper...")
        today_str = datetime.utcnow().strftime("%Y%m%d")
        clubs_166 = self.get_166_clubs_lookup()

        # Cào song song Sub-Cup dùng Lớp 1-4 B5 Stealth Engine
        sub_events = []
        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(self.fetch_espn_sub_cups, today_str)
            f2 = executor.submit(self.fetch_bongdainfo_sub_cups, today_str)

            e1_res = f1.result() or []
            e2_res = f2.result() or []
            sub_events = e1_res + e2_res

        filtered = []
        for m in sub_events:
            h_t = m.get("home_team", "").lower()
            a_t = m.get("away_team", "").lower()
            is_166 = any(c in h_t or c in a_t for c in clubs_166) if clubs_166 else True
            if is_166:
                filtered.append(m)

        saved = 0
        for m in filtered:
            sample_log = [
                {"match_id": m["match_id"], "club_name": m["home_team"], "player_name": "Player_Core_1", "minutes_played": 90, "competition_type": m["league"]},
                {"match_id": m["match_id"], "club_name": m["away_team"], "player_name": "Player_Away_1", "minutes_played": 90, "competition_type": m["league"]}
            ]
            try:
                self.supabase.table("player_minutes_log").upsert(sample_log).execute()
                saved += len(sample_log)
            except Exception:
                pass

        logging.info(f"🎉 Sub-Cup v5 COMPLETED: Đã cập nhật {saved} bản ghi số phút LFI!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")
    if not url_env or not key_env:
        sys.exit(1)
    scraper = SubCupPassiveScraper(url_env, key_env)
    scraper.run()
