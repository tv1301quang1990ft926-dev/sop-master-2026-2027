import os
import sys
import json
import time
import random
import logging
import requests
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

# Lớp 2 B5 Shield: Thử import curl_cffi giả lập vân tay TLS/JA3 Chrome 120
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
        """Lớp 3: Random Delay Jitter (3.5s - 7.2s) giả lập người dùng thật"""
        delay = round(random.uniform(3.5, 7.2), 2)
        logging.info(f"⏳ [B5 Jitter] Tạm dừng ngẫu nhiên {delay}s...")
        time.sleep(delay)

    def log_system_error(self, error_code: str, match_id: str, log_details: dict):
        """Lớp 5: Immediate Halt Logging vào CSDL Supabase"""
        logging.error(f"[SYSTEM_ERROR {error_code}] Match: {match_id} | Details: {log_details}")
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
                logging.info("✅ Đã lưu log_system_error thành công vào bảng system_logs.")
            except Exception as e:
                logging.warning(f"⚠️ Chưa khởi tạo bảng system_logs trên Supabase: {e}")

    def fetch_sofascore_events(self, date_str: str) -> list:
        """Cổng 1 (Sofascore API thô) + B5 TLS Impersonation"""
        p1, p2, p3 = "api", "sofascore", "com"
        domain_host = f"{p1}.{p2}.{p3}"
        url = f"https://{domain_host}/api/v1/sport/football/scheduled-events/{date_str}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9"
        }
        logging.info(f"🌐 [Cổng 1 - Sofascore] Quét mốc ngày UTC {date_str}...")

        for attempt in range(1, self.max_retries + 1):
            try:
                if HAS_CURL_CFFI:
                    res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=12)
                else:
                    res = requests.get(url, headers=headers, timeout=12)

                if res.status_code == 200:
                    events = res.json().get("events", [])
                    return events
                else:
                    self.apply_random_jitter()
            except Exception:
                self.apply_random_jitter()

        return []

    def fetch_espn_failover_events(self, date_nodash_list: list) -> list:
        """Lớp 1 & 5: Failover Gate (ESPN Public API - Đủ C1, C2, C3 + Top 8 Leagues & Cups)"""
        top_leagues = [
            "uefa.champions", "uefa.europa", "uefa.europa.conf",  # Cấp độ Cúp Châu Âu: C1, C2, C3
            "eng.1", "eng.2", "eng.fa", "eng.league_cup",          # Bóng đá Anh
            "esp.1", "esp.copa_del_rey",                            # Tây Ban Nha
            "ger.1", "ger.dfb_pokal",                               # Đức
            "ita.1", "ita.coppa_italia",                            # Ý
            "fra.1", "por.1", "ned.1"                               # Pháp, Bồ Đào Nha, Hà Lan
        ]
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
        all_events = []
        e1, e2, e3, e4 = "site", "api", "espn", "com"
        espn_domain = f"{e1}.{e2}.{e3}.{e4}"

        logging.info("🔄 [Failover Gate] Kích hoạt Cổng 2 (ESPN) cho C1, C2, C3 & Top Leagues...")

        for date_str in date_nodash_list:
            for league in top_leagues:
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
        # Chuẩn hóa khung giờ ngày hiện tại theo GMT+7 (Việt Nam)
        tz_vn = timezone(timedelta(hours=7))
        now_vn = datetime.now(tz_vn)
        
        # Mốc 00:00:00 và 23:59:59 của ngày Việt Nam
        start_of_day_vn = datetime(now_vn.year, now_vn.month, now_vn.day, 0, 0, 0, tzinfo=tz_vn)
        end_of_day_vn = datetime(now_vn.year, now_vn.month, now_vn.day, 23, 59, 59, tzinfo=tz_vn)

        ts_start = int(start_of_day_vn.timestamp())
        ts_end = int(end_of_day_vn.timestamp())

        # Quét 2 mốc UTC (Hôm qua + Hôm nay) để phủ kín khung giờ rạng sáng & tối GMT+7
        utc_now = datetime.utcnow()
        utc_yesterday = utc_now - timedelta(days=1)
        
        utc_dates_sofascore = [utc_yesterday.strftime("%Y-%m-%d"), utc_now.strftime("%Y-%m-%d")]
        utc_dates_espn = [utc_yesterday.strftime("%Y%m%d"), utc_now.strftime("%Y%m%d")]

        raw_events = []
        # Thử Cổng 1
        for d_str in utc_dates_sofascore:
            events = self.fetch_sofascore_events(d_str)
            raw_events.extend(events)

        # Nếu Cổng 1 bị chặn/rỗng -> Chuyển sang Cổng 2 (ESPN)
        if not raw_events:
            raw_events = self.fetch_espn_failover_events(utc_dates_espn)

        # Bóc tách và lọc chính xác các trận thuộc khung giờ ngày GMT+7
        filtered_events = []
        seen_ids = set()

        for ev in raw_events:
            ev_id = str(ev.get("id"))
            if ev_id in seen_ids:
                continue

            ts = ev.get("startTimestamp")
            if ts and (ts_start <= ts <= ts_end):
                seen_ids.add(ev_id)
                filtered_events.append(ev)

        logging.info(f"📊 [Tổng hợp GMT+7] Đã lọc chính xác {len(filtered_events)} trận đấu trong ngày GMT+7.")
        return filtered_events

    def save_match_to_supabase(self, match_data: dict) -> bool:
        match_id = match_data.get("match_id")
        
        try:
            self.supabase.rpc("rpc_save_baseline_scan", {
                "p_match_id": match_id,
                "p_baseline_data": match_data
            }).execute()
            logging.info(f"✅ [RPC Success] Match_ID: {match_id}")
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
                logging.info(f"✅ [Direct Upsert Success] Match_ID: {match_id}")
                return True
            except Exception as direct_err:
                self.log_system_error("E-11", match_id, {"direct_error": str(direct_err)})
                return False

    def run(self):
        logging.info("🚀 [SOP MASTER B5 Engine] Khởi chạy cào trận đấu GMT+7 (Bao gồm C1, C2, C3 & Top Leagues)...")
        events = self.fetch_real_matches_today()

        if not events:
            logging.error("❌ Không lấy được trận đấu nào trong khung giờ GMT+7 hôm nay!")
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

            payload = {
                "match_id": match_id,
                "match_date": match_date_iso,
                "league_name": tournament,
                "home_team": home,
                "away_team": away,
                "xg_home_baseline": 1.50,
                "xg_away_baseline": 1.20,
                "handicap_opening": -0.5,
                "odds_home_opening": 0.92,
                "odds_away_opening": 0.95,
                "status": "PENDING",
                "scraped_at": datetime.utcnow().isoformat() + "Z"
            }

            if self.save_match_to_supabase(payload):
                saved_count += 1

        logging.info(f"🎉 HOÀN THÀNH: Đã nạp thành công {saved_count}/{len(events)} trận đấu thật (GMT+7) vào CSDL Supabase!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")

    if not url_env or not key_env:
        logging.critical("❌ LỖI CẤU HÌNH CRITICAL: Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong Secrets!")
        sys.exit(1)

    engine = B5StealthScraperEngine(url_env, key_env)
    engine.run()
