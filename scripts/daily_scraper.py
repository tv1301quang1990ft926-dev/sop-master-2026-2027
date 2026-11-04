import os
import requests
from datetime import datetime
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def scrape_real_matches_today():
    print("🚀 Bắt đầu cào dữ liệu trận đấu THẬT hôm nay từ cổng Live...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong môi trường!")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    }
    
    # Endpoint API cào danh sách trận đấu thật trong ngày
    url = f"[suspicious link removed]{today_str}"
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"❌ Cổng dữ liệu phản hồi mã {response.status_code}")
            return

        data = response.json()
        events = data.get("events", [])
        print(f"📊 Tìm thấy {len(events)} trận đấu thật trong ngày {today_str}.")

        saved_count = 0
        for event in events:
            tournament = event.get("tournament", {}).get("name", "League")
            category = event.get("tournament", {}).get("category", {}).get("name", "")
            
            home_team = event.get("homeTeam", {}).get("name")
            away_team = event.get("awayTeam", {}).get("name")
            start_timestamp = event.get("startTimestamp")
            
            if not home_team or not away_team or not start_timestamp:
                continue

            match_id = f"{today_str}_{event.get('id')}"
            match_date = datetime.utcfromtimestamp(start_timestamp).isoformat() + "Z"
            
            payload = {
                "match_id": match_id,
                "match_date": match_date,
                "league_name": f"{category} - {tournament}",
                "home_team": home_team,
                "away_team": away_team,
                "xg_home_baseline": 1.50,
                "xg_away_baseline": 1.20,
                "handicap_opening": -0.5,
                "odds_home_opening": 0.92,
                "odds_away_opening": 0.95,
                "status": "PENDING"
            }

            # Nạp trận thật vào CSDL Supabase
            supabase.rpc("rpc_save_baseline_scan", {
                "p_match_id": match_id,
                "p_baseline_data": payload
            }).execute()
            saved_count += 1

        print(f"✅ Đã nạp thành công {saved_count} trận đấu THẬT vào Supabase!")

    except Exception as e:
        print(f"❌ Sự cố cào dữ liệu: {e}")

if __name__ == "__main__":
    scrape_real_matches_today()
