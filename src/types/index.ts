export interface StaticClub {
  club_id: string;
  club_name: string;
  league_code: string;
  head_coach: string;
  coach_nationality: string;
  preferred_formation: string;
  formation_starting: string;
  formation_build_up: string;
  ppda_baseline: number;
  tactical_philosophy: string;
  core_axis_squad: Record<string, string>;
  squad_ratings: Record<string, number>;
  squad_by_position: Record<string, string[]>;
  competition_tags: string[];
  updated_at: string;
}

export type LoadStatus = 'loading' | 'ready' | 'error';

export type PhaseId = 'baseline' | 'tracking' | 'lockin' | 'audit';

export interface H2HEntry {
  date: string;
  home_team: string;
  away_team: string;
  score?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  winner?: string | null;
}

export interface BaselinePayload {
  xg_home_baseline: number | null;
  xg_away_baseline: number | null;
  odds_home_1x2?: number | null;
  odds_draw_1x2?: number | null;
  odds_away_1x2?: number | null;
  handicap_opening: number | null;
  odds_home_opening: number | null;
  odds_away_opening: number | null;
  over_under_opening?: number | null;
  odds_over_opening?: number | null;
  odds_under_opening?: number | null;
  home_logo?: string | null;
  away_logo?: string | null;
  h2h_history?: H2HEntry[] | null;
}

export interface TrackingMovement {
  match_id: string;
  giai_dau: string;
  tran_dau: string;
  handicap_opening: number | null;
  handicap_current_t3h: number | null;
  odds_home_t3h: number | null;
  odds_away_t3h: number | null;
  overunder_opening: number | null;
  overunder_current_t3h: number | null;
  expected_edge_t3h: number | null;
  smart_money_signal: string | null;
  trap_odds_warning: boolean;
  update_timestamp_t3h: string;
}

export interface BaselineMatch {
  match_id: string;
  match_date: string;
  league_name: string;
  home_team: string;
  away_team: string;
  home_logo?: string | null;
  away_logo?: string | null;
  baseline_payload: BaselinePayload | null;
}
