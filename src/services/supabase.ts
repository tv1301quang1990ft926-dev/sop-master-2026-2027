import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchTodayMatches() {
  const { data, error } = await supabase
    .from('sop_master_baseline_scans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Lỗi truy vấn Supabase:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Bóc tách dữ liệu 2 tầng từ baseline_payload & cột phẳng
  return data.map((item) => {
    const p = item.baseline_payload || {};
    const xgHome = Number(item.xg_home_baseline ?? p.xg_home_baseline ?? 1.2);
    const xgAway = Number(item.xg_away_baseline ?? p.xg_away_baseline ?? 1.0);
    
    const h2h = (Array.isArray(item.h2h_history) && item.h2h_history.length > 0)
      ? item.h2h_history
      : (Array.isArray(p.h2h_history) ? p.h2h_history : []);

    return {
      match_id: item.match_id || p.match_id,
      league_name: item.league_name || item.giai_dau || p.league_name || 'Serie A',
      home_team: item.home_team || p.home_team || 'Home',
      away_team: item.away_team || p.away_team || 'Away',
      kickoff_time: p.kickoff_time || item.kickoff_time || item.gio_thi_dau_gmt7 || 'TBD',
      match_date: item.match_date || p.match_date,
      xg_home_baseline: xgHome,
      xg_away_baseline: xgAway,
      h2h_history: h2h,
      odds_home_1x2: Number(p.odds_home_1x2 ?? item.odds_home_opening ?? 2.0),
      odds_draw_1x2: Number(p.odds_draw_1x2 ?? 3.2),
      odds_away_1x2: Number(p.odds_away_1x2 ?? item.odds_away_opening ?? 3.5),
      handicap_opening: Number(p.handicap_opening ?? item.handicap_opening ?? 0),
      over_under_opening: Number(p.over_under_opening ?? item.over_under_opening ?? 2.5),
      odds_home_opening: Number(p.odds_home_opening ?? 0.90),
      odds_away_opening: Number(p.odds_away_opening ?? 0.90),
      odds_over_opening: Number(p.odds_over_opening ?? 0.88),
      odds_under_opening: Number(p.odds_under_opening ?? 0.88),
      cross_check_status: p.cross_check_status || 'CONSENSUS_HIGH',
      consensus_score: p.consensus_score || 100
    };
  });
}