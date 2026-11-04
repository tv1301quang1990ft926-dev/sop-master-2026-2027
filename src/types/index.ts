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
  home_score: number;
  away_score: number;
}

export interface BaselineMatch {
  match_id: string;
  league_name: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  opening_spread: number | null;
  opening_total: number | null;
  poisson_home_win_pct: number | null;
  poisson_draw_pct: number | null;
  poisson_away_win_pct: number | null;
  baseline_xg_home: number | null;
  baseline_xg_away: number | null;
  h2h_history: H2HEntry[] | null;
}
