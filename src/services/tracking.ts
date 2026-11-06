import { supabase } from '@/services/supabase';
import type { TrackingMovement } from '@/types';

const fallbackMovements: TrackingMovement[] = [
  {
    match_id: 'demo-tracking-1',
    giai_dau: 'UEFA EUROPA LEAGUE',
    tran_dau: 'Manchester United - PAOK FC',
    handicap_opening: -0.75,
    handicap_current_t3h: -0.75,
    odds_home_t3h: 0.92,
    odds_away_t3h: 0.9,
    overunder_opening: 2.75,
    overunder_current_t3h: 2.75,
    expected_edge_t3h: 8.4,
    smart_money_signal: 'Đội nhà',
    trap_odds_warning: true,
    update_timestamp_t3h: new Date().toISOString(),
  },
  {
    match_id: 'demo-tracking-2',
    giai_dau: 'UEFA CHAMPIONS LEAGUE',
    tran_dau: 'Real Madrid - Dortmund',
    handicap_opening: -1,
    handicap_current_t3h: -1.25,
    odds_home_t3h: 0.86,
    odds_away_t3h: 1.02,
    overunder_opening: 3,
    overunder_current_t3h: 3.25,
    expected_edge_t3h: 10.2,
    smart_money_signal: 'Tài',
    trap_odds_warning: false,
    update_timestamp_t3h: new Date().toISOString(),
  },
  {
    match_id: 'demo-tracking-3',
    giai_dau: 'ENGLISH PREMIER LEAGUE',
    tran_dau: 'Chelsea - Arsenal',
    handicap_opening: 0,
    handicap_current_t3h: 0,
    odds_home_t3h: 0.95,
    odds_away_t3h: 0.93,
    overunder_opening: 2.5,
    overunder_current_t3h: 2.25,
    expected_edge_t3h: 4.1,
    smart_money_signal: 'Cân bằng',
    trap_odds_warning: false,
    update_timestamp_t3h: new Date().toISOString(),
  },
];

export async function fetchTrackingMovements(): Promise<TrackingMovement[]> {
  const { data, error } = await supabase
    .from('sop_master_tracking_movements')
    .select('*')
    .order('update_timestamp_t3h', { ascending: false })
    .returns<TrackingMovement[]>();

  if (error || !data || data.length === 0) return fallbackMovements;
  return data;
}
