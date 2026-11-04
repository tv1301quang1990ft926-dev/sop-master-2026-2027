import { supabase } from '@/services/supabase';
import type { BaselineMatch } from '@/types';
import { getTodayRangeGmt7 } from '@/utils/dates';

export async function fetchTodayMatches(): Promise<BaselineMatch[]> {
  const { start, end } = getTodayRangeGmt7();

  const { data, error } = await supabase
    .from('sop_master_giai_doan_1_baseline')
    .select('*')
    .gte('kickoff_at', start)
    .lt('kickoff_at', end)
    .order('kickoff_at', { ascending: true })
    .returns<BaselineMatch[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
