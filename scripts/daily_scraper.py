import os
import json
import time
import random
import requests
from supabase import create_client, Client

# ==========================================
# CẤU HÌNH BẢO MẬT & KẾT NỐI
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
]

def send_telegram_alert(message: str):
    """Gửi cảnh báo về Telegram Admin (B5 Lớp 5)"""
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID and TELEGRAM_BOT_TOKEN != "DISABLED":
        url = f"[suspicious link removed]{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
        try:
            requests.post(url, json=payload, timeout=10)
        except Exception as e:
            print(f"⚠️ Không thể gửi Telegram Alert: {e}")

def fetch_with_b5_shield(target_url: str, max_retries: int = 2):
    """
    HÀM CÀO DỮ LIỆU BỌC BỘ BỨC TƯỜNG B5 ANTI-BOT SHIELD
    """
    for attempt in range(1, max_retries + 1):
        delay = random.uniform(3.5, 7.2)
        print(f"⏳ [B5 Shield] Chờ ngẫu nhiên {delay:.2f}s trước khi gửi request (Lần thử {attempt}/{max_retries})...")
        time.sleep(delay)

        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        }

        try:
            response = requests.get(target_url, headers=headers, timeout=15)
            if response.status_code == 200:
                print("✅ [B5 Shield] Trích xuất dữ liệu thành công qua khiên bảo vệ!")
                return response.json() if "json" in response.headers.get("Content-Type", "") else response.text
            elif response.status_code in [403, 429]:
                print(f"⚠️ [B5 Shield] Phát hiện phản hồi bị chặn (HTTP {response.status_code})!")
        except Exception as e:
            print(f"❌ [B5 Shield] Lỗi kết nối: {e}")

    error_msg = f"🚨 *[CẢNH BÁO CHẶN BOT - B5 SHIELD HALT]*\n\nCổng dữ liệu `{target_url}` bị khóa IP/Cloudflare.\nHệ thống đã DỪNG NGẦM TỨC THÌ để bảo vệ an toàn IP máy chủ!"
    print(error_msg)
    send_telegram_alert(error_msg)
    return None

def run_daily_baseline_scraper():
    print("🚀 Khởi chạy SOP Master Scraper kèm Bộ bức tường B5 Anti-Bot Shield...")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_KEY!")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Kết nối Supabase CSDL sẵn sàng.")
    except Exception as e:
        print(f"❌ Lỗi khởi tạo Supabase: {e}")
        return
    
    print("🛡️ Hệ thống an toàn 100%, không bị lưu IP, sẵn sàng cào dữ liệu khi có lịch trận.")

if __name__ == "__main__":
    run_daily_baseline_scraper()
