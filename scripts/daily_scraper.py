import os
import json
import requests
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

def send_telegram_alert(message: str):
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID and TELEGRAM_BOT_TOKEN != "DISABLED":
        url = f"[suspicious link removed]{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
        try:
            requests.post(url, json=payload, timeout=10)
        except Exception as e:
            print(f"Lỗi gửi Telegram: {e}")

def run_daily_baseline_scraper():
    print("🚀 Bắt đầu kịch bản cào dữ liệu trận đấu hôm nay (GĐ1 Baseline)...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Thiếu thông tin cấu hình Supabase URL/KEY")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Đã kết nối Supabase thành công. Đang xử lý đồng bộ dữ liệu...")
    send_telegram_alert("⚽ *SOP Master 2026-2027*\n\n✅ Kịch bản cào dữ liệu tự động đã kích hoạt thành công!")

if __name__ == "__main__":
    run_daily_baseline_scraper()
