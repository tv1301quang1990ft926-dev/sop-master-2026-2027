import { supabase } from '@/services/supabase';
import type { BaselineMatch } from '@/types';

export async function fetchTodayMatches(): Promise<BaselineMatch[]> {
  const { data, error } = await supabase
    .from('sop_master_baseline_scans')
    .select('*')
    .order('match_date', { ascending: true });

  if (error) {
    console.error('Lỗi khi truy vấn Supabase:', error);
    throw new Error(error.message);
  }

  if (!data) return [];

  // Parse baseline_payload an toàn nếu Supabase trả về chuỗi JSON (TEXT/VARCHAR)
  return data.map((item: any) => {
    let payload = item.baseline_payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }

    return {
      ...item,
      baseline_payload: payload || item.baseline_payload,
      // Đảm bảo h2h_history luôn truy cập được nếu nằm trong payload
      h2h_history: item.h2h_history || payload?.h2h_history || [],
    } as BaselineMatch;
  });
}