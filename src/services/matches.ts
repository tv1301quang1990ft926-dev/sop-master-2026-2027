import { supabase, normalizeMatchData } from '@/services/supabase';
import type { BaselineMatch } from '@/types';

export async function fetchTodayMatches(): Promise<BaselineMatch[]> {
  const { data, error } = await supabase
    .from('sop_master_baseline_scans')
    .select('*')
    .order('match_date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Two-tier extraction: normalise every raw row through normalizeMatchData.
  // If Supabase returned at least one match, return this REAL data — never
  // fall back to mock/sample data.
  return data.map((row) => normalizeMatchData(row as Record<string, unknown>));
}
