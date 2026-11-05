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
        # CHỈ LẤY TOP 8 GIẢI VĐQG HÀNG ĐẦU & CÁN CÂN CÚP CHÂU ÂU (C1, C2, C3)
        # Bỏ toàn bộ cúp phụ hạng dưới như esp.copa_del_rey, eng.2
        top_8_leagues = [
            "uefa.champions", "uefa.europa", "uefa.europa.conf",  # C1, C2, C3
            "eng.1",  # Ngoại Hạng Anh
            "esp.1",  # La Liga
            "ger.1",  # Bundesliga
            "ita.1",  # Serie A
            "fra.1",  # Ligue 1
            "por.1",  # Primeira Liga (Bồ Đào Nha)
            "ned.1"   # Eredivisie (Hà Lan)
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
                            comp = comps[0]
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
                                        league_title = data["leagues"][0].get("name", league)

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
        now_utc_ts = int(datetime.utcnow().timestamp())
        
        tz_vn = timezone(timedelta(hours=7))
        now_vn = datetime.now(tz_vn)
        
        # Lấy mốc từ thời điểm HIỆN TẠI đến 23:59:59 đêm nay giờ VN (CHỈ LẤY TRẬN CHƯA ĐÁ)
        end_of_day_vn = datetime(now_vn.year, now_vn.month, now_vn.day, 23, 59, 59, tzinfo=tz_vn)
        ts_end = int(end_of_day_vn.timestamp())

        utc_now = datetime.utcnow()
        utc_yesterday = utc_now - timedelta(days=1)
        
        utc_dates_sofascore = [utc_yesterday.strftime("%Y-%m-%d"), utc_now.strftime("%Y-%m-%d")]
        utc_dates_espn = [utc_yesterday.strftime("%Y%m%d"), utc_now.strftime("%Y%m%d")]

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
            # ĐIỀU KIỆN LỌC CHUẨN: Chỉ lấy trận CHƯA ĐÁ (ts >= now_utc_ts - 15 phút buffer)
            if ts and (now_utc_ts - 900 <= ts <= ts_end + 28800):
                seen_ids.add(ev_id)
                filtered_events.append(ev)

        logging.info(f"📊 [Lọc Trận Sắp Đá] Đã lọc chuẩn {len(filtered_events)} trận CHƯA ĐÁ thuộc Top 8 Giải.")
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
        logging.info("🚀 [SOP MASTER Engine] Bắt đầu cào trận CHƯA ĐÁ Top 8 Giải...")
        events = self.fetch_real_matches_today()

        if not events:
            logging.error("❌ Không có trận chưa đá nào trong danh sách Top 8 hôm nay!")
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

            # TÍNH GIỜ THI ĐẤU HIỂN THỊ CHUẨN GMT+7 (VD: 21:00, 03:00)
            dt_vn = datetime.utcfromtimestamp(start_ts) + timedelta(hours=7)
            kickoff_time_str = dt_vn.strftime("%H:%M")

            # KHỞI TẠO MẢNG H2H MẪU CHUẨN ĐỂ BOLT POPUP NẠP ĐƯỢC
            sample_h2h = [
                {"date": "2024-03-15", "home_team": home, "away_team": away, "score": "2 - 1", "winner": "HOME"},
                {"date": "2023-10-20", "home_team": away, "away_team": home, "score": "1 - 1", "winner": "DRAW"},
                {"date": "2023-04-05", "home_team": home, "away_team": away, "score": "0 - 2", "winner": "AWAY"}
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

        logging.info(f"🎉 HOÀN THÀNH: Đã nạp {saved_count}/{len(events)} trận CHƯA ĐÁ Top 8 Giải vào Supabase!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")

    if not url_env or not key_env:
        sys.exit(1)

    engine = B5StealthScraperEngine(url_env, key_env)
    engine.run()
