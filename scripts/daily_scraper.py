import os
import sys
import json
import time
import logging
import requests
from datetime import datetime
from supabase import create_client, Client

# Khởi tạo Logger chuẩn để GitHub Actions in chi tiết từng dòng log
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

class StealthScraperEngine:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.max_retries = 3
        self.retry_delay_sec = 2
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        
        try:
            self.supabase: Client = create_client(supabase_url, supabase_key)
            logging.info("✅ Khởi tạo Supabase Client thành công.")
        except Exception as e:
            logging.error(f"❌ Không thể kết nối Supabase Client: {e}")
            sys.exit(1)

    def log_system_error(self, error_code: str, match_id: str, log_details: dict):
        """Ghi nhận lỗi kỹ thuật vào Stored Procedure rpc_log_system_error trên Supabase"""
        logging.error(f"[SYSTEM_ERROR {error_code}] Match: {match_id} | Details: {log_details}")
        try:
            self.supabase.rpc("rpc_log_system_error", {
                "p_error_code": error_code,
                "p_match_id": match_id or "N/A",
                "p_log_details": log_details
            }).execute()
        except Exception as e:
            logging.warning(f"⚠️ Không thể lưu log_system_error vào Supabase: {e}")

    def fetch_real_matches_today(self) -> list:
        """Cào danh sách trận đấu thực tế trong ngày hôm nay"""
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "[suspicious link removed]"
        }
        
        domain_host = "api.sofascore.com"
        url = f"https://{domain_host}/api/v1/sport/football/scheduled-events/{today_str}"
        logging.info(f"🌐 Đang gọi API cào trận thật: {url}")

        events = []
        for attempt in range(1, self.max_retries + 1):
            try:
                res = requests.get(url, headers=headers, timeout=15)
                if res.status_code == 200:
                    data = res.json()
                    events = data.get("events", [])
                    logging.info(f"📊 Tìm thấy {len(events)} trận đấu thật ngày {today_str}.")
                    break
                else:
                    logging.warning(f"⚠️ Lần thử {attempt}/{self.max_retries}: HTTP {res.status_code}")
                    time.sleep(self.retry_delay_sec)
            except Exception as e:
                logging.warning(f"⚠️ Lần thử {attempt}/{self.max_retries} bị lỗi kết nối: {e}")
                time.sleep(self.retry_delay_sec)

        if not events:
            self.log_system_error("E-10", "N/A", {"url": url, "status": "NO_EVENTS_OR_BLOCKED"})

        return events

    def save_match_to_supabase(self, match_data: dict) -> bool:
        """Lưu trận đấu vào CSDL Supabase với cơ chế 2 tầng (RPC + Fallback Direct Upsert)"""
        match_id = match_data.get("match_id")
        
        # Tầng 1: Thử gọi Stored Procedure rpc_save_baseline_scan
        try:
            self.supabase.rpc("rpc_save_baseline_scan", {
                "p_match_id": match_id,
                "p_baseline_data": match_data
            }).execute()
            logging.info(f"✅ [RPC Save Success] Đã nạp match_id: {match_id}")
            return True
        except Exception as rpc_err:
            logging.warning(f"⚠️ RPC thất bại ({rpc_err}). Chuyển sang Tầng 2: Upsert trực tiếp bảng...")
            
            # Tầng 2: Fallback trực tiếp vào bảng sop_master_baseline_scans nếu Stored Procedure bị thiếu
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
                logging.info(f"✅ [Direct Upsert Success] Đã nạp match_id: {match_id}")
                return True
            except Exception as direct_err:
                self.log_system_error("E-11", match_id, {"rpc_error": str(rpc_err), "direct_error": str(direct_err)})
                return False

    def run(self):
        """Khởi chạy toàn bộ luồng cào và nạp dữ liệu"""
        logging.info("🚀 [SOP MASTER Engine] Bắt đầu tiến trình cào dữ liệu Giai Đoạn 1 Baseline...")
        events = self.fetch_real_matches_today()

        if not events:
            logging.error("❌ Không tìm thấy dữ liệu trận đấu nào để nạp!")
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

        logging.info(f"🎉 HOÀN THÀNH: Đã nạp thành công {saved_count}/{len(events)} trận đấu thật vào CSDL Supabase!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")

    if not url_env or not key_env:
        logging.critical("❌ LỖI CẤU HÌNH CRITICAL: Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong Secrets của GitHub!")
        sys.exit(1)

    engine = StealthScraperEngine(url_env, key_env)
    engine.run()
