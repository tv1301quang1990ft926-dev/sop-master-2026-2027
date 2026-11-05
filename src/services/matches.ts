import { supabase } from '@/services/supabase';
import type { BaselineMatch } from '@/types';

export async function fetchTodayMatches(): Promise<BaselineMatch[]> {
  const { data, error } = await supabase
    .from('sop_master_baseline_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<BaselineMatch[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
