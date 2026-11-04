import os
import requests
from datetime import datetime
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def main():
    print("🚀 [SOP Master] Khởi chạy cào dữ liệu trận đấu hôm nay...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_KEY!")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    }
    
    # Cổng cào lịch thi đấu trận thật hôm nay
    url = f"[suspicious link removed]{today_str}"
    
    try:
        res = requests.get(url, headers=headers, timeout=15)
        if res.status_code != 200:
            print(f"⚠️ Cổng phản hồi mã {res.status_code}")
            return

        events = res.json().get("events", [])
        print(f"📊 Tìm thấy {len(events)} trận đấu trong ngày {today_str}.")

        saved_count = 0
        for event in events:
            home = event.get("homeTeam", {}).get("name")
            away = event.get("awayTeam", {}).get("name")
            start_ts = event.get("startTimestamp")
            tournament = event.get("tournament", {}).get("name", "Football League")
            
            if not home or not away or not start_ts:
                continue

            match_id = f"{today_str}_{event.get('id')}"
            match_date = datetime.utcfromtimestamp(start_ts).isoformat() + "Z"
            
            baseline_payload = {
                "match_id": match_id,
                "match_date": match_date,
                "league_name": tournament,
                "home_team": home,
                "away_team": away,
                "xg_home_baseline": 1.50,
                "xg_away_baseline": 1.20,
                "handicap_opening": -0.5,
                "odds_home_opening": 0.92,
                "odds_away_opening": 0.95,
                "status": "PENDING"
            }

            # Gọi RPC rpc_save_baseline_scan lưu vào bảng sop_master_baseline_scans
            supabase.rpc("rpc_save_baseline_scan", {
                "p_match_id": match_id,
                "p_baseline_data": baseline_payload
            }).execute()
            
            saved_count += 1

        print(f"✅ Đã nạp thành công {saved_count} trận thật vào Supabase!")

    except Exception as e:
        print(f"❌ Lỗi cào dữ liệu: {e}")

if __name__ == "__main__":
    main()
