import os
from datetime import datetime
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def run_daily_baseline_scraper():
    print("🚀 [SOP Master Scraper] Khởi chạy cào dữ liệu GĐ1 Baseline...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Thiếu cấu hình SUPABASE_URL / SUPABASE_KEY!")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    match_id = "20261104_EPL_Arsenal_Chelsea"
    baseline_payload = {
        "match_id": match_id,
        "match_date": datetime.utcnow().isoformat(),
        "league_name": "Premier League 2026-2027",
        "home_team": "Arsenal",
        "away_team": "Chelsea",
        "xg_home_baseline": 1.85,
        "xg_away_baseline": 1.20,
        "handicap_opening": -0.75,
        "odds_home_opening": 0.95,
        "odds_away_opening": 0.93,
        "status": "PENDING"
    }

    try:
        # Gọi chính xác Stored Procedure rpc_save_baseline_scan
        supabase.rpc("rpc_save_baseline_scan", {
            "p_match_id": match_id,
            "p_baseline_data": baseline_payload
        }).execute()
        print(f"✅ [RPC rpc_save_baseline_scan] Đã ghi nạp dữ liệu GĐ1 cho trận: {match_id}")
    except Exception as e:
        print(f"❌ Lỗi gọi RPC rpc_save_baseline_scan: {e}")

if __name__ == "__main__":
    run_daily_baseline_scraper()
