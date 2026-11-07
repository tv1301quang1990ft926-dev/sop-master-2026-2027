// Shared input types for the 11-module SOP Master quant engine.
// Each formula module declares its own input interface extending these primitives
// so callers can assemble a full MatchInputs object once and pass it through.

export type LeagueCode =
  | 'EPL' | 'LALIGA' | 'SERIEA' | 'BUNDES' | 'LIGUE1'
  | 'UCL' | 'UEL' | 'UECL'
  | 'FA_CUP' | 'CARABAO' | 'COPA_DEL_REY' | 'DFB_POKAL' | 'COUPE_DE_FRANCE'
  | 'OTHER';

export type CompetitionTier = 'EU_CUP' | 'TOP5' | 'NATIONAL_CUP' | 'LEAGUE_CUP' | 'OTHER';

export type Weather = 'RAIN' | 'SNOW' | 'BAD_PITCH' | 'NORMAL';

export type TacticalStyle = 'HIGH_PRESS' | 'LOW_BLOCK' | 'POSSESSION' | 'COUNTER';

export interface MatchSlice {
  // A single finished match slice for time-decay xG (Rule 3).
  xG_for: number;
  xG_against: number;
  // minutes played by the team in this slice (for fatigue windowing)
  minutes?: number;
  played_at: string; // ISO date
  is_home?: boolean;
}

export interface H2HMatchSlice {
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  played_at: string;
  competition?: string;
}

export interface CoachH2HSlice {
  manager_a: string;
  manager_b: string;
  manager_a_team: string; // team A was managing at the time
  manager_b_team: string;
  manager_a_score: number;
  manager_b_score: number;
  played_at: string;
}

export interface PlayerFatigueLog {
  player_id: string;
  minutes_played: number;
  competition_tier: CompetitionTier;
  played_at: string; // ISO date
}

export interface SubstitutionEntry {
  sub_rating: number;
}

export interface RefereeStats {
  yellow_per_match: number;
  red_per_match: number;
  fouls_home_avg: number;
  fouls_away_avg: number;
}

export interface CardMarketLine {
  line_over_under: number; // O/U card total line
  handicap_card: number;   // card handicap line
  odds_over: number;
  odds_under: number;
}

export interface SetPieceSplit {
  sp_xg_att: number; // set-piece xG generated (attack)
  sp_xga_def: number; // set-piece xG conceded (defence)
  // time-decay slices for the current season
  slices?: MatchSlice[];
}

export interface TeamContextInput {
  team_id: string;
  league_code: LeagueCode;
  league_size: number;       // 18 or 20
  current_position: number;  // 1-based
  points: number;
  // competitors in the same race (top-4 / top-8 / relegation pack)
  competitor_results_this_round?: 'WON' | 'LOST' | 'DREW' | 'NOT_PLAYED';
  in_eu_cup_league_phase?: boolean;
  eu_cup_phase_position?: number; // 1..36
  race: 'TOP_EUROPE' | 'SURVIVAL' | 'NONE';
}

export interface MatchInputs {
  // ---- xG time-decay ----
  home_slices: MatchSlice[];
  away_slices: MatchSlice[];

  // ---- home/away split ----
  league_home_avg_xg: number;
  league_away_avg_xg: number;

  // ---- H2H 3D matrix ----
  h2h_club_slices: H2HMatchSlice[];
  h2h_current_club: CoachH2HSlice[];
  h2h_career: CoachH2HSlice[];
  home_manager: string;
  away_manager: string;
  home_manager_current_club: string;
  away_manager_current_club: string;

  // ---- defensive errors ----
  home_defensive_errors: number;
  away_defensive_errors: number;
  home_key_fouls_avg: number;
  away_key_fouls_avg: number;

  // ---- set piece edge ----
  home_set_piece: SetPieceSplit;
  away_set_piece: SetPieceSplit;

  // ---- motivation ----
  home_context: TeamContextInput;
  away_context: TeamContextInput;

  // ---- squad depth RQI ----
  home_sub_ratings: number[];
  away_sub_ratings: number[];
  home_starter_avg_score: number;
  away_starter_avg_score: number;
  home_subs_used: number;
  away_subs_used: number;

  // ---- tactical synergy ----
  home_tactical_style: TacticalStyle;
  away_tactical_style: TacticalStyle;

  // ---- weather / pitch ----
  weather: Weather;

  // ---- referee CCRI ----
  referee: RefereeStats;
  card_line?: CardMarketLine | null;

  // ---- fatigue LFI ----
  home_player_minutes: PlayerFatigueLog[];
  away_player_minutes: PlayerFatigueLog[];

  // baseline opening (for edge comparisons)
  opening_handicap: number;
  opening_total: number;
}

export interface PoissonInputs {
  home_xg: number;
  away_xg: number;
}

export interface PoissonResult {
  home_win: number;
  draw: number;
  away_win: number;
  // most likely scorelines sorted by probability
  top_scorelines: { score: string; probability: number }[];
  expected_total: number;
  expected_handicap: number; // home - away
}

export interface FormulaFactor {
  factor: number;
  detail: string;
}
