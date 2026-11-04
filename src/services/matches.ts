import { supabase } from '@/services/supabase';
import type { BaselineMatch } from '@/types';
import { getTodayDateGmt7 } from '@/utils/dates';

export async function fetchTodayMatches(): Promise<BaselineMatch[]> {
  const { data, error } = await supabase
    .from('sop_master_baseline_scans')
    .select('match_id, match_date, league_name, home_team, away_team, baseline_payload')
    .eq('match_date', getTodayDateGmt7())
    .order('league_name', { ascending: true })
    .returns<BaselineMatch[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
