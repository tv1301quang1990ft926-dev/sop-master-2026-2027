import { supabase } from '@/services/supabase';
import type { BaselineMatch } from '@/types';

export async function fetchTodayMatches(): Promise<BaselineMatch[]> {
  const { data, error } = await supabase
    .from('sop_master_baseline_scans')
    .select('*')
    .order('match_date', { ascending: true })
    .returns<BaselineMatch[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
