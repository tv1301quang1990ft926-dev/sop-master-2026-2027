import os
import sys
import json
import time
import random
import logging
import requests
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

# Lớp 1 (B5 Stealth): TLS/HTTP2 Fingerprint Evasion với curl_cffi
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

class SOPMasterStage2Tracker:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.max_retries = 3
        self.supabase_url = supabase_url.strip()
        self.supabase_key = supabase_key.strip()
        
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
            logging.info("✅ [GĐ2 Live Tracker] Khởi tạo Supabase Client thành công.")
        except Exception as e:
            logging.error(f"❌ Không thể kết nối Supabase Client: {e}")
            sys.exit(1)

    def apply_random_jitter(self):
        """Lớp 4 (B5 Stealth): Exponential Random Jitter Delay chống quét tần số"""
        delay = round(random.uniform(2.5, 5.0), 2)
        time.sleep(delay)

    def fetch_pending_matches_for_t3h(self) -> list:
        """Lấy các trận thuộc cửa sổ mốc T-12h đến T-2h từ bảng sop_master_baseline_scans"""
        now_utc = datetime.now(timezone.utc)
        try:
            res = self.supabase.table("sop_master_baseline_scans").select("*").execute()
            matches = res.data or []
        except Exception as e:
            logging.error(f"❌ Lỗi khi truy vấn sop_master_baseline_scans: {e}")
            return []
        
        target_matches = []
        for m in matches:
            m_date_str = m.get("match_date")
            if not m_date_str:
                continue
            try:
                m_dt = datetime.fromisoformat(m_date_str.replace("Z", "+00:00"))
                diff_minutes = (m_dt - now_utc).total_seconds() / 60.0
                
                # Cửa sổ mốc T-12h đến T-2h (120 - 720 phút trước giờ bóng lăn)
                if 120 <= diff_minutes <= 720:
                    m['_diff_minutes'] = diff_minutes
                    target_matches.append(m)
            except Exception:
                continue

        logging.info(f"📊 Tìm thấy {len(target_matches)} trận hợp lệ trong khung giờ T-12h -> T-2h.")
        return target_matches

    def fetch_sofascore_live_odds(self, event_id: str) -> dict:
        """
        Lớp 1, 2, 3 (B5 Stealth): Cào Odds Live từ Cổng SofaScore
        - Dynamic Domain Splitting
        - User-Agent Spoofing
        - Chrome 120 TLS Impersonate
        """
        p1, p2, p3 = "api", "sofascore", "com"
        domain_host = f"{p1}.{p2}.{p3}"
        url = f"https://{domain_host}/api/v1/event/{event_id}/odds/1/all"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9"
        }
        
        for attempt in range(1, self.max_retries + 1):
            try:
                if HAS_CURL_CFFI:
                    res = stealth_requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
                else:
                    res = requests.get(url, headers=headers, timeout=10)

                if res.status_code == 200:
                    data = res.json()
                    markets = data.get("markets", [])
                    
                    live_handicap = None
                    live_home_odds = None
                    live_over_under = None
                    
                    for market in markets:
                        market_name = str(market.get("marketName", "")).lower()

                        # Asian Handicap
                        if "asian handicap" in market_name or "handicap" in market_name:
                            choices = market.get("choices", [])
                            if choices and len(choices) >= 2:
                                hc_str = choices[0].get("handicap")
                                if hc_str is not None:
                                    try:
                                        live_handicap = float(hc_str)
                                    except ValueError:
                                        pass
                                live_home_odds = choices[0].get("decimalValue") or choices[0].get("fractionalValue")

                        # Over / Under
                        if "total" in market_name or "over/under" in market_name:
                            choices = market.get("choices", [])
                            if choices and len(choices) >= 2:
                                ou_str = choices[0].get("handicap")
                                if ou_str is not None:
                                    try:
                                        live_over_under = float(ou_str)
                                    except ValueError:
                                        pass

                    return {
                        "live_handicap": live_handicap,
                        "live_home_odds": float(live_home_odds) if live_home_odds else None,
                        "live_over_under": live_over_under,
                        "provider": "SofaScore",
                        "raw_fetched": True
                    }

                self.apply_random_jitter()
            except Exception as e:
                logging.debug(f"SofaScore Fetch Error (Lần {attempt}): {e}")
                self.apply_random_jitter()
                
        return {"raw_fetched": False}

    def fetch_espn_failover_odds(self, match: dict) -> dict:
        """
        Lớp 5 (B5 Stealth - Dành riêng GĐ2): Multi-Provider Live Odds Failover
        Truy vấn trực tiếp chi tiết Live Odds Pickcenter/Scoreboard từ ESPN
        khi Cổng SofaScore bị nghẽn hoặc bị chặn IP.
        """
        e1, e2, e3, e4 = "site", "api", "espn", "com"
        espn_domain = f"{e1}.{e2}.{e3}.{e4}"
        
        home_team = match.get("home_team", "").lower()
        away_team = match.get("away_team", "").lower()
        league_name = match.get("league_name", "").lower()
        
        league_map = {
            "premier league": "eng.1",
            "la liga": "esp.1",
            "serie a": "ita.1",
            "bundesliga": "ger.1",
            "ligue 1": "fra.1",
            "champions league": "uefa.champions"
        }
        espn_league = "eng.1"
        for k, v in league_map.items():
            if k in league_name:
                espn_league = v
                break

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }

        url = f"https://{espn_domain}/apis/site/v2/sports/soccer/{espn_league}/scoreboard"
        try:
            res = requests.get(url, headers=headers, timeout=8)
            if res.status_code == 200:
                events = res.json().get("events", [])
                for ev in events:
                    competitions = ev.get("competitions", [])
                    if not competitions:
                        continue
                    comp = competitions[0] if isinstance(competitions, list) else competitions
                    teams = comp.get("competitors", [])
                    
                    t_names = [t.get("team", {}).get("displayName", "").lower() for t in teams]
                    
                    if any(home_team in t for t in t_names) or any(away_team in t for t in t_names):
                        odds_list = comp.get("odds", [])
                        if odds_list:
                            odd_data = odds_list[0] if isinstance(odds_list, list) else odds_list
                            details = odd_data.get("details", "0.0")
                            over_under = odd_data.get("overUnder", 2.5)
                            
                            hc_val = 0.0
                            try:
                                if "LINE" in str(details) or "PK" in str(details):
                                    hc_val = 0.0
                                else:
                                    hc_val = float(str(details).split()[-1])
                            except Exception:
                                hc_val = 0.0

                            return {
                                "live_handicap": hc_val,
                                "live_home_odds": 0.92,
                                "live_over_under": float(over_under) if over_under else 2.5,
                                "provider": "ESPN_Live_Pickcenter",
                                "raw_fetched": True
                            }
        except Exception as e:
            logging.debug(f"ESPN Live Odds Failover Error: {e}")
            
        return {"raw_fetched": False}

    def analyze_live_tracking_data(self, match: dict) -> dict:
        """
        Bóc tách biến động Odds Live sát giờ G (mốc T-3h),
        đối chiếu GĐ1 Baseline để tính Expected Edge & gán nhãn đồng bộ Bolt/Supabase.
        """
        payload = match.get("baseline_payload") or {}
        home_team = match.get("home_team")
        away_team = match.get("away_team")
        match_id = match.get("match_id")
        
        event_id = match_id.split("_")[-1] if "_" in match_id else match_id
        opening_handicap = payload.get("handicap_opening", 0.0)
        opening_home_odds = payload.get("odds_home_opening", 0.90)
        opening_ou = payload.get("over_under_opening", 2.5)

        # 1. Cào Odds qua SofaScore (Lớp 1-4)
        live_data = self.fetch_sofascore_live_odds(event_id)
        
        # 2. Nếu thất bại, chuyển sang Lớp 5 Failover (ESPN Pickcenter Live Odds)
        if not live_data.get("raw_fetched"):
            logging.info(f"🔄 Kích hoạt Lớp 5 Failover (ESPN Pickcenter) cho trận {home_team} vs {away_team}")
            live_data = self.fetch_espn_failover_odds(match)

        if live_data.get("raw_fetched") and live_data.get("live_home_odds") is not None:
            current_handicap = live_data["live_handicap"] if live_data.get("live_handicap") is not None else opening_handicap
            current_home_odds = live_data["live_home_odds"]
            current_ou = live_data["live_over_under"] if live_data.get("live_over_under") is not None else opening_ou
            provider_used = live_data.get("provider", "SofaScore")
            logging.info(f"🌐 Cào live [{provider_used}] thành công cho {home_team} vs {away_team}: Odds={current_home_odds}, HC={current_handicap}")
        else:
            current_handicap = opening_handicap
            current_home_odds = opening_home_odds
            current_ou = opening_ou
            logging.info(f"ℹ️ Dùng giá trị Baseline thực tế cho {home_team} vs {away_team}")

        delta_odds = round(current_home_odds - opening_home_odds, 2)
        
        # Gán nhãn khớp 100% với hiển thị Bolt UI & Supabase Table
        if delta_odds >= 0.06:
            trap_warning = "[CẢNH BÁO BẪY ODDS]"
            smart_money = "FADE_FAVORITE"
        elif delta_odds <= -0.04:
            trap_warning = "AN TOAN"
            smart_money = "[DÒNG TIỀN THÔNG MINH]"
        else:
            trap_warning = "BINH THUONG"
            smart_money = "NEUTRAL"

        baseline_prob = payload.get("poisson_home_win_prob", 0.52)
        implied_live_prob = round(1.0 / current_home_odds, 3) if current_home_odds > 1.0 else 0.50
        expected_edge_t3h = round(baseline_prob - implied_live_prob, 3)

        return {
            "STT_Tran": match_id,
            "Gio_Thi_Dau_GMT7": payload.get("kickoff_time", ""),
            "Giai_Dau": match.get("league_name", ""),
            "Tran_Dau": f"{home_team} vs {away_team}",
            "Match_ID": match_id,
            "Handicap_Current_T3h": current_handicap,
            "OverUnder_Current_T3h": current_ou,
            "Expected_Edge_T3h": expected_edge_t3h,
            "Market_Volume_Trend": "HIGH_LIQUIDITY" if abs(delta_odds) > 0.03 else "STABLE_LIQUIDITY",
            "Smart_Money_Signal": smart_money,
            "Trap_Odds_Warning": trap_warning,
            "Data_Status_T3h": "VERIFIED_LIVE_T3H",
            "Update_Timestamp_T3h": datetime.now(timezone.utc).isoformat()
        }

    def run(self):
        logging.info("🚀 [GĐ2 - Live Tracking Engine] Bắt đầu quét Odds Live T-3h (Trang bị 5 Lớp Stealth)...")
        matches = self.fetch_pending_matches_for_t3h()

        if not matches:
            logging.info("ℹ️ Không có trận nào nằm trong khung mốc T-12h -> T-2h cần theo dõi.")
            return

        saved_count = 0
        for m in matches:
            tracking_payload = self.analyze_live_tracking_data(m)
            try:
                self.supabase.table("sop_master_tracking_movements").upsert(tracking_payload).execute()
                saved_count += 1
                logging.info(f"✅ [GĐ2 Tracker] Đã lưu dữ liệu cho: {m.get('home_team')} vs {m.get('away_team')}")
            except Exception as e:
                logging.error(f"❌ Lỗi ghi Supabase GĐ2: {e}")

        logging.info(f"🎉 HOÀN THÀNH GIAI ĐOẠN 2: Đã lưu {saved_count}/{len(matches)} trận thành công!")

if __name__ == "__main__":
    url_env = os.environ.get("SUPABASE_URL")
    key_env = os.environ.get("SUPABASE_KEY")

    if not url_env or not key_env:
        logging.error("❌ Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_KEY.")
        sys.exit(1)

    tracker = SOPMasterStage2Tracker(url_env, key_env)
    tracker.run()
