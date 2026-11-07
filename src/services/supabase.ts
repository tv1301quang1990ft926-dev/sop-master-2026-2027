import { createClient } from '@supabase/supabase-js';
import type { BaselineMatch, BaselinePayload, H2HEntry } from '@/types';

const SUPABASE_URL = 'https://gswxpkphoerdfnwflikq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eY0yEHT0rkXLYSQw9WyeVw_bnxPm2FN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Two-tier data extraction: normalises a raw Supabase row into BaselineMatch.
// Tier 1 = top-level columns; Tier 2 = nested baseline_payload JSONB blob.
// ---------------------------------------------------------------------------

interface RawMatchRow {
  match_id?: string;
  match_date?: string;
  league_name?: string;
  home_team?: string;
  away_team?: string;
  home_logo?: string | null;
  away_logo?: string | null;
  baseline_payload?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export function normalizeMatchData(row: RawMatchRow): BaselineMatch {
  const payload = (row.baseline_payload ?? {}) as Record<string, unknown>;

  const matchId = String(row.match_id || payload.match_id || '');
  const leagueName = String(row.league_name || payload.league_name || payload.giai_dau || '');
  const homeTeam = String(row.home_team || payload.home_team || '');
  const awayTeam = String(row.away_team || payload.away_team || '');
  const matchDate = String(row.match_date || payload.match_date || payload.kickoff_time || '');

  const xgHomeBaseline = Number(payload.xg_home_baseline ?? row.xg_home_baseline ?? 1.2);
  const xgAwayBaseline = Number(payload.xg_away_baseline ?? row.xg_away_baseline ?? 1.0);

  const rawH2H = Array.isArray(row.h2h_history) && row.h2h_history.length > 0
    ? row.h2h_history
    : (payload.h2h_history as unknown[] | undefined);

  const h2hHistory: H2HEntry[] = Array.isArray(rawH2H)
    ? rawH2H.map((entry) => {
        const e = entry as Record<string, unknown>;
        return {
          date: String(e.date ?? ''),
          home_team: String(e.home_team ?? e.home ?? ''),
          away_team: String(e.away_team ?? e.away ?? ''),
          score: e.score != null ? String(e.score) : null,
          home_score: e.home_score != null ? Number(e.home_score) : null,
          away_score: e.away_score != null ? Number(e.away_score) : null,
          winner: e.winner != null ? String(e.winner) : null,
        } as H2HEntry;
      })
    : [];

  const baselinePayload: BaselinePayload = {
    xg_home_baseline: isNaN(xgHomeBaseline) ? 1.2 : xgHomeBaseline,
    xg_away_baseline: isNaN(xgAwayBaseline) ? 1.0 : xgAwayBaseline,
    odds_home_1x2: payload.odds_home_1x2 != null ? Number(payload.odds_home_1x2) : null,
    odds_draw_1x2: payload.odds_draw_1x2 != null ? Number(payload.odds_draw_1x2) : null,
    odds_away_1x2: payload.odds_away_1x2 != null ? Number(payload.odds_away_1x2) : null,
    handicap_opening: payload.handicap_opening != null ? Number(payload.handicap_opening) : null,
    odds_home_opening: payload.odds_home_opening != null ? Number(payload.odds_home_opening) : null,
    odds_away_opening: payload.odds_away_opening != null ? Number(payload.odds_away_opening) : null,
    over_under_opening: payload.over_under_opening != null ? Number(payload.over_under_opening) : null,
    odds_over_opening: payload.odds_over_opening != null ? Number(payload.odds_over_opening) : null,
    odds_under_opening: payload.odds_under_opening != null ? Number(payload.odds_under_opening) : null,
    home_logo: (row.home_logo ?? payload.home_logo ?? null) as string | null | undefined,
    away_logo: (row.away_logo ?? payload.away_logo ?? null) as string | null | undefined,
    h2h_history: h2hHistory,
  };

  return {
    match_id: matchId,
    match_date: matchDate,
    league_name: leagueName,
    home_team: homeTeam,
    away_team: awayTeam,
    home_logo: (row.home_logo ?? payload.home_logo ?? null) as string | null | undefined,
    away_logo: (row.away_logo ?? payload.away_logo ?? null) as string | null | undefined,
    baseline_payload: baselinePayload,
  };
}
