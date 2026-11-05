import { supabase } from '@/services/supabase';
import type { BaselineMatch } from '@/types';
import { getTodayRangeGmt7 } from '@/utils/dates';

export async function fetchTodayMatches(): Promise<BaselineMatch[]> {
  const { start, end } = getTodayRangeGmt7();

  const { data, error } = await supabase
    .from('sop_master_baseline_scans')
    .select('match_id, match_date, league_name, home_team, away_team, baseline_payload')
    .gte('match_date', start)
    .lte('match_date', end)
    .order('match_date', { ascending: true })
    .returns<BaselineMatch[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
