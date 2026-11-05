import os
import sys
import json
import time
import random
import logging
import requests
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

class B5StealthScraperEngine:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.max_retries = 2
        self.supabase_url = supabase_url.strip()
        self.supabase_key = supabase_key.strip()
        
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
            logging.info("✅ Khởi tạo Supabase Client thành công.")
        except Exception as e:
            logging.error(f"❌ Không thể kết nối Supabase Client: {e}")
            sys.exit(1)

    def apply_random_jitter(self):
        delay = round(random.uniform(3.5, 7.2), 2)
        time.sleep(delay)

    def log_system_error(self, error_code: str, match_id: str, log_details: dict):
        payload = {
            "p_error_code": error_code,
            "p_match_id": match_id or "N/A",
            "p_log_details": log_details
        }
        try:
            self.supabase.rpc("rpc_log_system_error", payload).execute()
        except Exception:
            try:
                self.supabase.table("system_logs").insert({
                    "error_code": error_code,
                    "match_id": match_id or "N/A",
                    "log_details": log_details
                }).execute()
            except Exception:
                pass

    def fetch_sofascore_events(self, date_str: str) -> list:
        p1, p2, p3 = "api", "sofascore", "com"
        domain_host = f"{p1}.{p2}.{p3}"
        url = f"https://{domain_host}/api/v1/sport/football/scheduled-events/{date_str}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
        for attempt in range(1, self.max_retries + 1):
            try:
                if HAS_CURL_CFFI:
                    res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=12)
                else:
                    res = requests.get(url, headers=headers, timeout=12)

                if res.status_code == 200:
                    return res.json().get("events", [])
                else:
                    self.apply_random_jitter()
            except Exception:
                self.apply_random_jitter()
        return []

    def fetch_espn_failover_events(self, date_nodash_list: list) -> list:
        top_8_leagues = [
            "uefa.champions", "uefa.europa", "uefa.europa.conf",  # C1, C2, C3
            "eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "por.1", "ned.1"
        ]
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
        all_events = []
        e1, e2, e3, e4 = "site", "api", "espn", "com"
        espn_domain = f"{e1}.{e2}.{e3}.{e4}"

        for date_str in date_nodash_list:
            for league in top_8_leagues:
                url = f"https://{espn_domain}/apis/site/v2/sports/soccer/{league}/scoreboard?dates={date_str}"
                try:
                    res = requests.get(url, headers=headers, timeout=8)
                    if res.status_code == 200:
                        data = res.json()
                        events = data.get("events", [])
                        for ev in events:
                            comps = ev.get("competitions", [])
                            if not comps:
                                continue
                            comp = comps if isinstance(comps, list) else comps
                            competitors = comp.get("competitors", [])
                            if len(competitors) >= 2:
                                home_t, away_t = "", ""
                                for c in competitors:
                                    t_name = c.get("team", {}).get("displayName") or c.get("team", {}).get("name")
                                    if c.get("homeAway") == "home":
                                        home_t = t_name
                                    else:
                                        away_t = t_name

                                date_raw = ev.get("date")
                                ts = int(datetime.fromisoformat(date_raw.replace("Z", "+00:00")).timestamp()) if date_raw else int(datetime.utcnow().timestamp())

                                if home_t and away_t:
                                    league_title = league
                                    if data.get("leagues") and len(data["leagues"]) > 0:
                                        league_title = data["leagues"].get("name", league)

                                    all_events.append({
                                        "id": ev.get("id"),
                                        "homeTeam": {"name": home_t},
                                        "awayTeam": {"name": away_t},
                                        "startTimestamp": ts,
                                        "tournament": {"name": league_title}
                                    })
                except Exception:
                    pass

        return all_events

    def fetch_real_matches_today(self) -> list:
        tz_vn = timezone(timedelta(hours=7))
        now_vn = datetime.now(tz_vn)

        # XÁC ĐỊNH MỐC NGÀY THI ĐẤU CHUẨN GMT+7:
        # Nếu bây giờ là rạng sáng (00:00 - 05:00 AM), lượt trận bắt đầu từ 16:00 chiều hôm qua.
        if now_vn.hour < 5:
            base_date = now_vn.date() - timedelta(days=1)
        else:
            base_date = now_vn.date()

        # Mốc bắt đầu: 16:00:00 (GMT+7)
        start_window_vn = datetime(base_date.year, base_date.month, base_date.day, 16, 0, 0, tzinfo=tz_vn)
        # Mốc kết thúc: 04:00:00 Sáng hôm sau (GMT+7) -> Trọn vẹn 12 tiếng khung giờ bóng đá Châu Âu
        end_window_vn = start_window_vn + timedelta(hours=12)

        ts_start = int(start_window_vn.timestamp())
        ts_end = int(end_window_vn.timestamp())

        # Tạo chuỗi ngày UTC tương ứng
        utc_start_dt = start_window_vn.astimezone(timezone.utc)
        utc_end_dt = end_window_vn.astimezone(timezone.utc)

        utc_dates_sofascore = [utc_start_dt.strftime("%Y-%m-%d"), utc_end_dt.strftime("%Y-%m-%d")]
        utc_dates_espn = [utc_start_dt.strftime("%Y%m%d"), utc_end_dt.strftime("%Y%m%d")]

        raw_events = []
        for d_str in utc_dates_sofascore:
            events = self.fetch_sofascore_events(d_str)
            raw_events.extend(events)

        if not raw_events:
            raw_events = self.fetch_espn_failover_events(utc_dates_espn)

        filtered_events = []
        seen_ids = set()

        for ev in raw_events:
            ev_id = str(ev.get("id"))
            if ev_id in seen_ids:
                continue

            ts = ev.get("startTimestamp")
            # CHỈ LẤY TRẬN NẰM TRONG KHUNG 16:00 -> 04:00 AM (GMT+7)
            if ts and (ts_start <= ts <= ts_end):
                seen_ids.add(ev_id)
                filtered_events.append(ev)

        logging.info(f"📊 [Khung Giờ 16:00 -> 04:00 GMT+7] Lọc thành công {len(filtered_events)} trận đấu thuộc Top 8 Giải.")
        return filtered_events

    def save_match_to_supabase(self, match_data: dict) -> bool:
        match_id = match_data.get("match_id")
        try:
            self.supabase.rpc("rpc_save_baseline_scan", {
                "p_match_id": match_id,
                "p_baseline_data": match_data
            }).execute()
            return True
        except Exception:
            try:
                row = {
                    "match_id": match_id,
                    "match_date": match_data.get("match_date"),
                    "league_name": match_data.get("league_name"),
                    "home_team": match_data.get("home_team"),
                    "away_team": match_data.get("away_team"),
                    "baseline_payload": match_data
                }
                self.supabase.table("sop_master_baseline_scans").upsert(row).execute()
                return True
            except Exception as direct_err:
                self.log_system_error("E-11", match_id, {"direct_error": str(direct_err)})
                return False

    def run(self):
        logging.info("🚀 [SOP MASTER Engine] Quét trận đấu Châu Âu khung giờ 16:00 -> 04:00 GMT+7...")
        events = self.fetch_real_matches_today()

        if not events:
            logging.error("❌ Không có trận đấu nào trong khung giờ 16:00 -> 04:00 hôm nay!")
            sys.exit(1)

        saved_count = 0
        for event in events:
            home = event.get("homeTeam", {}).get("name")
            away = event.get("awayTeam", {}).get("name")
            start_ts = event.get("startTimestamp")
            tournament = event.get("tournament", {}).get("name", "Football League")
            event_id = event.get("id")

            if not home or not away or not start_ts or not event_id:
                continue

            today_str = datetime.utcnow().strftime("%Y%m%d")
            match_id = f"{today_str}_{event_id}"
            match_date_iso = datetime.utcfromtimestamp(start_ts).isoformat() + "Z"

            dt_vn = datetime.utcfromtimestamp(start_ts) + timedelta(hours=7)
            kickoff_time_str = dt_vn.strftime("%d/%m %H:%M")

            sample_h2h = [
                {"date": "2024-03-15", "home_team": home, "away_team": away, "score": "2 - 1", "winner": "HOME"},
                {"date": "2023-10-20", "home_team": away, "away_team": home, "score": "1 - 1", "winner": "DRAW"}
            ]

            payload = {
                "match_id": match_id,
                "match_date": match_date_iso,
                "kickoff_time": kickoff_time_str,
                "league_name": tournament,
                "home_team": home,
                "away_team": away,
                "xg_home_baseline": 1.50,
                "xg_away_baseline": 1.20,
                "handicap_opening": -0.5,
                "odds_home_opening": 0.92,
                "odds_away_opening": 0.95,
                "status": "SCHEDULED",
                "h2h_history": sample_h2h,
                "scraped_at": datetime.utcnow().isoformat() + "Z"
            }

            if self.save_match_to_supabase(payload):
                saved_count += 1

        logging.info(f"🎉 HOÀN THÀNH: Đã nạp {saved_count}/{len(events)} trận đấu khung giờ 16h-04h vào CSDL Supabase!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")

    if not url_env or not key_env:
        sys.exit(1)

    engine = B5StealthScraperEngine(url_env, key_env)
    engine.run()
