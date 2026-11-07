// Poisson orchestrator — SOP Master 2026-2027 four-phase quant engine.
//
// Each phase runs a specific subset of the 11 formula modules. The orchestrator
// guarantees that LFI (module 11) is NOT computed before BTC publishes the
// official lineup (GĐ1 & GĐ2), and IS computed at GĐ3 (T-1h) once the 11
// starters are confirmed. GĐ4 runs a closed-loop audit that feeds back into
// the AI calibration loop.
//
// -----------------------------------------------------------------------
// GĐ1 — T-24h Baseline Scan:      modules 1, 2, 3, 10 + sub_cup_scraper
// GĐ2 — T-3h  Live Tracking:       module 6 (live standings) + odds movements
// GĐ3 — T-1h  Lock-in Execution:   modules 4, 7, 8, 9, 11 + lineup verified
// GĐ4 — FT+5-10m Closed-Loop Audit: FT/xG scrape, L-01..L-04 root-cause,
//                                    manager tactical adaptation, AI retrain
// -----------------------------------------------------------------------

import {
  xgWeighted,
  homeAwaySplit,
  h2h3DMatrix,
  defensiveErrors,
  setPieceEdge,
  motivationTrigger,
  squadDepthRQI,
  tacticalSynergy,
  weatherPitchFactor,
  refereeRiskCCRI,
  matchFatigueLFI,
} from './formulas';
import type {
  MatchInputs,
  PoissonResult,
  FormulaFactor,
  Weather,
  RefereeStats,
  CardMarketLine,
  PlayerFatigueLog,
  TeamContextInput,
  TacticalStyle,
  MatchSlice,
  H2HMatchSlice,
  CoachH2HSlice,
  SetPieceSplit,
} from './formulas/types';

// ============================================================
// Phase identifiers
// ============================================================

export type Phase = 'GĐ1' | 'GĐ2' | 'GĐ3' | 'GĐ4';

export interface PhaseConfig {
  phase: Phase;
  label: string;
  modules: number[];
  lineupRequired: boolean;
  lfiEnabled: boolean;
}

export const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
  'GĐ1': {
    phase: 'GĐ1',
    label: 'T-24h Baseline Scan',
    modules: [1, 2, 3, 10],
    lineupRequired: false,
    lfiEnabled: false,
  },
  'GĐ2': {
    phase: 'GĐ2',
    label: 'T-3h Live Tracking',
    modules: [6],
    lineupRequired: false,
    lfiEnabled: false,
  },
  'GĐ3': {
    phase: 'GĐ3',
    label: 'T-1h Lock-in Execution',
    modules: [4, 7, 8, 9, 11],
    lineupRequired: true,
    lfiEnabled: true,
  },
  'GĐ4': {
    phase: 'GĐ4',
    label: 'FT+5-10m Closed-Loop Audit',
    modules: [],
    lineupRequired: true,
    lfiEnabled: true,
  },
};

// ============================================================
// Budget allocation — 4 tiers (GĐ3 output)
// ============================================================

export interface BudgetAllocation {
  tier1_main: number;      // 45 coin
  tier2_backup: number;    // 35 coin
  tier3_parlay: number;    // 15 coin
  tier4_longshot: number;  // 5 coin
}

export const DEFAULT_BUDGET: BudgetAllocation = {
  tier1_main: 45,
  tier2_backup: 35,
  tier3_parlay: 15,
  tier4_longshot: 5,
};

// ============================================================
// Live odds movement (Rule 5) — GĐ2
// ============================================================

export interface OddsSnapshot {
  handicap: number;
  total: number;
  home_odds: number;
  away_odds: number;
  over_odds: number;
  under_odds: number;
  timestamp: string;
}

export interface OddsMovement {
  opening: OddsSnapshot;
  current: OddsSnapshot;
  smart_money_shift: boolean;
  odds_trap_warning: boolean;
  edge: number; // current edge vs opening
}

export function detectOddsMovement(opening: OddsSnapshot, current: OddsSnapshot): OddsMovement {
  const handicapDelta = current.handicap - opening.handicap;
  const totalDelta = current.total - opening.total;
  const oddsDelta = current.home_odds - opening.home_odds;

  // Smart money: handicap moves toward the home side while odds shorten
  const smartMoneyShift = handicapDelta > 0.25 && oddsDelta < -0.15;
  // Odds trap: handicap moves sharply but odds lengthen (trap bait)
  const oddsTrapWarning = Math.abs(handicapDelta) > 0.5 && oddsDelta > 0.2;

  const edge = current.home_odds > 0 ? (1 / current.home_odds) - (1 / opening.home_odds) : 0;

  return {
    opening,
    current,
    smart_money_shift: smartMoneyShift,
    odds_trap_warning: oddsTrapWarning,
    edge,
  };
}

// ============================================================
// Lineup verification (GĐ3 gate)
// ============================================================

export interface LineupVerification {
  verified: boolean;
  home_starters: string[]; // 11 player IDs
  away_starters: string[];
  verified_at: string | null;
}

// ============================================================
// Circuit breaker (GĐ3 T-15p warm-up check)
// ============================================================

export interface CircuitBreaker {
  triggered: boolean;
  reason: string;
  inhibit_signals: boolean;
}

export function checkCircuitBreaker(
  lineup: LineupVerification,
  injuriesAtWarmup: string[],
): CircuitBreaker {
  if (!lineup.verified) {
    return {
      triggered: true,
      reason: 'Lineup chưa xác minh 100% — phong tỏa tín hiệu',
      inhibit_signals: true,
    };
  }
  if (injuriesAtWarmup.length > 0) {
    return {
      triggered: true,
      reason: `Chấn thương warm-up: ${injuriesAtWarmup.join(', ')} — phong tỏa Tầng 1`,
      inhibit_signals: true,
    };
  }
  return { triggered: false, reason: 'OK', inhibit_signals: false };
}

// ============================================================
// GĐ4 — Post-match audit types
// ============================================================

export type RootCauseCode = 'L-01' | 'L-02' | 'L-03' | 'L-04' | 'NONE';

export interface RootCause {
  code: RootCauseCode;
  label: string;
  description: string;
}

export const ROOT_CAUSES: Record<RootCauseCode, RootCause> = {
  'L-01': {
    code: 'L-01',
    label: 'Thẻ đỏ sớm (RCII >= 0.15)',
    description: 'Cầu thủ nhận thẻ đỏ sớm thay đổi cục diện trận đấu — bất khả kháng.',
  },
  'L-02': {
    code: 'L-02',
    label: 'Lỗi AI',
    description: 'Mô hình định lượng dự đoán sai do dữ liệu đầu vào hoặc trọng số công thức lệch.',
  },
  'L-03': {
    code: 'L-03',
    label: 'Lỗi Human',
    description: 'Lỗi vận hành con người (nhập sai kèo, đọc nhầm lineup, sai khối lượng cược).',
  },
  'L-04': {
    code: 'L-04',
    label: 'Lỗi HLV / Ứng biến chiến thuật',
    description: 'HLV thay người hoặc điều chỉnh sơ đồ kém, bị lật kèo đối phương.',
  },
  'NONE': {
    code: 'NONE',
    label: 'Không có lỗi',
    description: 'Kết quả đúng như dự đoán, không phát sinh root-cause.',
  },
};

export type SubstitutionReason =
  | 'INJURY'           // bất khả kháng — chấn thương
  | 'EARLY_RED_CARD'   // bất khả kháng — thẻ đỏ sớm (RCII >= 0.15)
  | 'TACTICAL'         // điều chỉnh chiến thuật
  | 'NEUTRALIZED';     // HLV ứng biến cứu trận thành công

export interface SubstitutionEvent {
  minute: number;
  half: 1 | 2;
  team: 'home' | 'away';
  player_out: string;
  player_in: string;
  reason: SubstitutionReason;
  score_at_time: { home: number; away: number };
}

export interface ManagerAdaptationResult {
  manager: string;
  team: 'home' | 'away';
  substitutions: SubstitutionEvent[];
  tactical_rescue_bonus: number; // positive = rescued the match
  tags: string[];
  l04_triggered: boolean;
}

export interface AuditResult {
  ft_score: { home: number; away: number };
  actual_xg: { home: number; away: number };
  root_causes: RootCause[];
  manager_adaptations: ManagerAdaptationResult[];
  player_minutes_logged: number;
  calibration_data: {
    l04_events: SubstitutionEvent[];
    manager_index_updates: { manager: string; adaptation_delta: number }[];
  };
}

// ============================================================
// RCII — Red Card Impact Index (for L-01 classification)
// ============================================================

export function redCardImpactIndex(
  redCardMinute: number | null,
  matchTotalMinutes: number = 90,
): number {
  if (redCardMinute == null) return 0;
  // Earlier red = higher impact. Normalised to [0, ~0.5].
  const remaining = Math.max(1, matchTotalMinutes - redCardMinute);
  return remaining / matchTotalMinutes * 0.5;
}

// ============================================================
// GĐ4 — Manager tactical adaptation evaluation
// ============================================================

export function evaluateManagerAdaptation(
  substitutions: SubstitutionEvent[],
  manager: string,
  team: 'home' | 'away',
  finalScore: { home: number; away: number },
): ManagerAdaptationResult {
  const tags: string[] = [];
  let rescueBonus = 0;
  let l04 = false;

  const tacticalSubs = substitutions.filter(
    (s) => s.reason === 'TACTICAL' || s.reason === 'NEUTRALIZED',
  );
  const forcedSubs = substitutions.filter(
    (s) => s.reason === 'INJURY' || s.reason === 'EARLY_RED_CARD',
  );

  // Evaluate: did the team improve after tactical substitutions?
  for (const sub of tacticalSubs) {
    const scoreAtSub = sub.score_at_time;
    const isMyTeam = sub.team === team;
    const myGoalsAtSub = isMyTeam ? scoreAtSub.home : scoreAtSub.away;
    const oppGoalsAtSub = isMyTeam ? scoreAtSub.away : scoreAtSub.home;
    const wasLosing = myGoalsAtSub < oppGoalsAtSub;

    const myFinal = isMyTeam ? finalScore.home : finalScore.away;
    const oppFinal = isMyTeam ? finalScore.away : finalScore.home;
    const isDrawOrWin = myFinal >= oppFinal;

    if (wasLosing && isDrawOrWin) {
      rescueBonus += 0.5;
      sub.reason = 'NEUTRALIZED';
      tags.push('[L-01 NEUTRALIZED]');
    }
  }

  // L-04: HLV ứng biến tệ — many tactical subs but team still lost or got worse
  const myFinal = team === 'home' ? finalScore.home : finalScore.away;
  const oppFinal = team === 'home' ? finalScore.away : finalScore.home;
  if (tacticalSubs.length >= 2 && myFinal < oppFinal) {
    l04 = true;
    tags.push('L-04: HLV ứng biến tệ / bị lật kèo');
  }

  if (forcedSubs.length > 0) {
    tags.push('Bất khả kháng: chấn thương/thẻ đỏ');
  }

  return {
    manager,
    team,
    substitutions,
    tactical_rescue_bonus: rescueBonus,
    tags,
    l04_triggered: l04,
  };
}

// ============================================================
// GĐ4 — Root cause classification
// ============================================================

export function classifyRootCause(
  redCardMinute: number | null,
  aiPredictionCorrect: boolean,
  humanErrorDetected: boolean,
  managerAdaptations: ManagerAdaptationResult[],
): RootCause[] {
  const causes: RootCause[] = [];

  const rcii = redCardImpactIndex(redCardMinute);
  if (rcii >= 0.15) {
    causes.push(ROOT_CAUSES['L-01']);
  }

  if (!aiPredictionCorrect && !humanErrorDetected && rcii < 0.15) {
    const hasL04 = managerAdaptations.some((m) => m.l04_triggered);
    if (hasL04) {
      causes.push(ROOT_CAUSES['L-04']);
    } else {
      causes.push(ROOT_CAUSES['L-02']);
    }
  }

  if (humanErrorDetected) {
    causes.push(ROOT_CAUSES['L-03']);
  }

  if (causes.length === 0) {
    causes.push(ROOT_CAUSES['NONE']);
  }

  return causes;
}

// ============================================================
// GĐ4 — Closed-loop audit
// ============================================================

export interface AuditInputs {
  ft_score: { home: number; away: number };
  actual_xg: { home: number; away: number };
  red_card_minute: number | null;
  substitutions: SubstitutionEvent[];
  home_manager: string;
  away_manager: string;
  ai_prediction_correct: boolean;
  human_error_detected: boolean;
  player_minutes_to_log: PlayerFatigueLog[];
}

export function runClosedLoopAudit(inputs: AuditInputs): AuditResult {
  const homeAdapt = evaluateManagerAdaptation(
    inputs.substitutions.filter((s) => s.team === 'home'),
    inputs.home_manager,
    'home',
    inputs.ft_score,
  );
  const awayAdapt = evaluateManagerAdaptation(
    inputs.substitutions.filter((s) => s.team === 'away'),
    inputs.away_manager,
    'away',
    inputs.ft_score,
  );

  const rootCauses = classifyRootCause(
    inputs.red_card_minute,
    inputs.ai_prediction_correct,
    inputs.human_error_detected,
    [homeAdapt, awayAdapt],
  );

  const l04Events = inputs.substitutions.filter((s) => s.reason === 'NEUTRALIZED');
  const managerIndexUpdates = [
    { manager: inputs.home_manager, adaptation_delta: homeAdapt.tactical_rescue_bonus - (homeAdapt.l04_triggered ? 1 : 0) },
    { manager: inputs.away_manager, adaptation_delta: awayAdapt.tactical_rescue_bonus - (awayAdapt.l04_triggered ? 1 : 0) },
  ];

  return {
    ft_score: inputs.ft_score,
    actual_xg: inputs.actual_xg,
    root_causes: rootCauses,
    manager_adaptations: [homeAdapt, awayAdapt],
    player_minutes_logged: inputs.player_minutes_to_log.length,
    calibration_data: {
      l04_events: l04Events,
      manager_index_updates: managerIndexUpdates,
    },
  };
}

// ============================================================
// Phase orchestrator — runs the correct module subset per phase
// ============================================================

export interface PhaseResult {
  phase: Phase;
  label: string;
  home_xg: number;
  away_xg: number;
  factors: FormulaFactor[];
  modules_run: number[];
  modules_skipped: number[];
  lfi_computed: boolean;
  lineup_verified: boolean | null;
  ccri_alert: boolean;
  ccri_tag: string;
  odds_movement?: OddsMovement;
  budget?: BudgetAllocation;
  circuit_breaker?: CircuitBreaker;
  audit?: AuditResult;
  poisson?: PoissonResult;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonPmf(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

const MAX_GOALS = 8;

export function poissonProbabilities(homeXG: number, awayXG: number): PoissonResult {
  const homePmf: number[] = [];
  const awayPmf: number[] = [];
  for (let k = 0; k <= MAX_GOALS; k++) {
    homePmf.push(poissonPmf(k, homeXG));
    awayPmf.push(poissonPmf(k, awayXG));
  }

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  const scorelines: { score: string; probability: number }[] = [];

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = homePmf[h] * awayPmf[a];
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
      scorelines.push({ score: `${h}-${a}`, probability: p });
    }
  }

  const total = homeWin + draw + awayWin;
  if (total > 0) {
    homeWin /= total;
    draw /= total;
    awayWin /= total;
  }

  scorelines.sort((x, y) => y.probability - x.probability);

  return {
    home_win: homeWin,
    draw,
    away_win: awayWin,
    top_scorelines: scorelines.slice(0, 5),
    expected_total: homeXG + awayXG,
    expected_handicap: homeXG - awayXG,
  };
}

// Backward-compatible full-engine breakdown (all 11 modules).
export interface PoissonBreakdown {
  home_xg: number;
  away_xg: number;
  factors: FormulaFactor[];
  ccri_alert: boolean;
  ccri_tag: string;
}

export function computePoisson(inputs: MatchInputs, matchISO: string): PoissonBreakdown {
  const factors: FormulaFactor[] = [];

  const homeXG = xgWeighted(inputs.home_slices);
  const awayXG = xgWeighted(inputs.away_slices);
  factors.push({ factor: homeXG.xg_for, detail: `xG decay Home: for=${homeXG.xg_for.toFixed(3)} against=${homeXG.xg_against.toFixed(3)}` });
  factors.push({ factor: awayXG.xg_for, detail: `xG decay Away: for=${awayXG.xg_for.toFixed(3)} against=${awayXG.xg_against.toFixed(3)}` });

  const ha = homeAwaySplit(inputs.league_home_avg_xg, inputs.league_away_avg_xg);
  factors.push({ factor: ha.home_factor, detail: `Home/Away: home×${ha.home_factor.toFixed(3)} away×${ha.away_factor.toFixed(3)}` });

  const h2h = h2h3DMatrix(
    inputs.h2h_club_slices,
    inputs.h2h_current_club,
    inputs.h2h_career,
    inputs.home_context.team_id,
    inputs.home_manager,
    inputs.away_manager,
  );
  factors.push({ factor: h2h.home_factor, detail: `H2H 3D: home×${h2h.home_factor.toFixed(3)} away×${h2h.away_factor.toFixed(3)} impact=${h2h.impact.toFixed(4)}` });

  const defAway = defensiveErrors(inputs.away_defensive_errors, inputs.away_key_fouls_avg);
  const defHome = defensiveErrors(inputs.home_defensive_errors, inputs.home_key_fouls_avg);
  factors.push({ factor: defAway.opponent_multiplier, detail: `Def errors Away: opponent×${defAway.opponent_multiplier.toFixed(3)}` });
  factors.push({ factor: defHome.opponent_multiplier, detail: `Def errors Home: opponent×${defHome.opponent_multiplier.toFixed(3)}` });

  const sp = setPieceEdge(inputs.home_set_piece, inputs.away_set_piece);
  factors.push({ factor: sp.sp_edge, detail: `SP Edge: ${sp.sp_edge.toFixed(3)} (homeNet=${sp.home_sp_net.toFixed(3)} awayNet=${sp.away_sp_net.toFixed(3)})` });

  const motHome = motivationTrigger(inputs.home_context);
  const motAway = motivationTrigger(inputs.away_context);
  factors.push({ factor: motHome.factor, detail: `Motivation Home: ${motHome.reason}` });
  factors.push({ factor: motAway.factor, detail: `Motivation Away: ${motAway.reason}` });

  const rqiHome = squadDepthRQI(inputs.home_sub_ratings, inputs.home_starter_avg_score, inputs.home_subs_used);
  const rqiAway = squadDepthRQI(inputs.away_sub_ratings, inputs.away_starter_avg_score, inputs.away_subs_used);
  factors.push({ factor: rqiHome.rqi, detail: `RQI Home: ${rqiHome.rqi.toFixed(3)}` });
  factors.push({ factor: rqiAway.rqi, detail: `RQI Away: ${rqiAway.rqi.toFixed(3)}` });

  const tss = tacticalSynergy(inputs.home_tactical_style, inputs.away_tactical_style);
  factors.push({ factor: tss.home_bonus, detail: `TSS ${tss.matchup}: home×${tss.home_bonus.toFixed(2)} away×${tss.away_bonus.toFixed(2)}` });

  const wpf = weatherPitchFactor(inputs.weather);
  factors.push({ factor: wpf, detail: `WPF ${inputs.weather}: ×${wpf.toFixed(2)}` });

  const ccri = refereeRiskCCRI(inputs.referee, inputs.card_line ?? null);
  factors.push({ factor: ccri.ccri, detail: `CCRI=${ccri.ccri.toFixed(2)} ${ccri.tag} -> ${ccri.recommendation}` });

  const lfiHome = matchFatigueLFI(inputs.home_player_minutes, matchISO);
  const lfiAway = matchFatigueLFI(inputs.away_player_minutes, matchISO);
  factors.push({ factor: lfiHome.lfi, detail: `LFI Home: ${lfiHome.lfi.toFixed(3)} (7d=${lfiHome.minutes_7d}min)` });
  factors.push({ factor: lfiAway.lfi, detail: `LFI Away: ${lfiAway.lfi.toFixed(3)} (7d=${lfiAway.minutes_7d}min)` });

  const homeBaseAttack = homeXG.xg_for * ha.home_factor;
  const awayBaseAttack = awayXG.xg_for * ha.away_factor;

  const homeAttack =
    homeBaseAttack * h2h.home_factor * defAway.opponent_multiplier *
    motHome.factor * (0.5 + 0.5 * rqiHome.rqi) * tss.home_bonus * wpf * lfiHome.lfi;

  const awayAttack =
    awayBaseAttack * h2h.away_factor * defHome.opponent_multiplier *
    motAway.factor * (0.5 + 0.5 * rqiAway.rqi) * tss.away_bonus * wpf * lfiAway.lfi;

  const spHomeAdd = Math.max(0, sp.home_sp_net) * 0.5;
  const spAwayAdd = Math.max(0, sp.away_sp_net) * 0.5;

  return {
    home_xg: Math.max(0.1, homeAttack + spHomeAdd),
    away_xg: Math.max(0.1, awayAttack + spAwayAdd),
    factors,
    ccri_alert: ccri.alert,
    ccri_tag: ccri.tag,
  };
}

// ============================================================
// Phase-specific orchestration
// ============================================================

export interface PhaseRunInputs {
  phase: Phase;
  matchISO: string;
  inputs: MatchInputs;
  // GĐ2 — live odds
  oddsOpening?: OddsSnapshot;
  oddsCurrent?: OddsSnapshot;
  // GĐ3 — lineup + warm-up injuries
  lineup?: LineupVerification;
  warmupInjuries?: string[];
}

export function runPhase(runInputs: PhaseRunInputs): PhaseResult {
  const config = PHASE_CONFIGS[runInputs.phase];
  const { inputs, matchISO } = runInputs;
  const factors: FormulaFactor[] = [];
  const skipped: number[] = [];

  // ---- Common pre-computations shared across phases ----
  const homeXG = xgWeighted(inputs.home_slices);
  const awayXG = xgWeighted(inputs.away_slices);
  const ha = homeAwaySplit(inputs.league_home_avg_xg, inputs.league_away_avg_xg);

  // Default multiplicative factors (1.0 = no effect)
  let h2hHomeFactor = 1.0;
  let h2hAwayFactor = 1.0;
  let defAwayMult = 1.0;
  let defHomeMult = 1.0;
  let spHomeAdd = 0;
  let spAwayAdd = 0;
  let motHomeFactor = 1.0;
  let motAwayFactor = 1.0;
  let rqiHomeFactor = 1.0;
  let rqiAwayFactor = 1.0;
  let tssHomeBonus = 1.0;
  let tssAwayBonus = 1.0;
  let wpf = 1.0;
  let lfiHomeFactor = 1.0;
  let lfiAwayFactor = 1.0;
  let ccriAlert = false;
  let ccriTag = '';

  // ===== GĐ1: modules 1, 2, 3, 10 =====
  if (config.modules.includes(1)) {
    factors.push({ factor: homeXG.xg_for, detail: `[GĐ1] xG decay Home: for=${homeXG.xg_for.toFixed(3)} against=${homeXG.xg_against.toFixed(3)}` });
    factors.push({ factor: awayXG.xg_for, detail: `[GĐ1] xG decay Away: for=${awayXG.xg_for.toFixed(3)} against=${awayXG.xg_against.toFixed(3)}` });
  } else {
    skipped.push(1);
  }

  if (config.modules.includes(2)) {
    factors.push({ factor: ha.home_factor, detail: `[GĐ1] Home/Away: home×${ha.home_factor.toFixed(3)} away×${ha.away_factor.toFixed(3)}` });
  } else {
    skipped.push(2);
  }

  if (config.modules.includes(3)) {
    const h2h = h2h3DMatrix(
      inputs.h2h_club_slices, inputs.h2h_current_club, inputs.h2h_career,
      inputs.home_context.team_id, inputs.home_manager, inputs.away_manager,
    );
    h2hHomeFactor = h2h.home_factor;
    h2hAwayFactor = h2h.away_factor;
    factors.push({ factor: h2hHomeFactor, detail: `[GĐ1] H2H 3D: home×${h2hHomeFactor.toFixed(3)} away×${h2hAwayFactor.toFixed(3)}` });
  } else {
    skipped.push(3);
  }

  if (config.modules.includes(10)) {
    const ccri = refereeRiskCCRI(inputs.referee, inputs.card_line ?? null);
    ccriAlert = ccri.alert;
    ccriTag = ccri.tag;
    factors.push({ factor: ccri.ccri, detail: `[GĐ1] CCRI=${ccri.ccri.toFixed(2)} ${ccri.tag} -> ${ccri.recommendation}` });
  } else {
    skipped.push(10);
  }

  // ===== GĐ2: module 6 (live standings trigger) =====
  if (config.modules.includes(6)) {
    const motHome = motivationTrigger(inputs.home_context);
    const motAway = motivationTrigger(inputs.away_context);
    motHomeFactor = motHome.factor;
    motAwayFactor = motAway.factor;
    factors.push({ factor: motHomeFactor, detail: `[GĐ2] Motivation Home: ${motHome.reason}` });
    factors.push({ factor: motAwayFactor, detail: `[GĐ2] Motivation Away: ${motAway.reason}` });
  } else {
    skipped.push(6);
  }

  // ===== GĐ3: modules 4, 7, 8, 9, 11 =====
  if (config.modules.includes(4)) {
    const defAway = defensiveErrors(inputs.away_defensive_errors, inputs.away_key_fouls_avg);
    const defHome = defensiveErrors(inputs.home_defensive_errors, inputs.home_key_fouls_avg);
    defAwayMult = defAway.opponent_multiplier;
    defHomeMult = defHome.opponent_multiplier;
    factors.push({ factor: defAwayMult, detail: `[GĐ3] Def errors Away: opponent×${defAwayMult.toFixed(3)}` });
    factors.push({ factor: defHomeMult, detail: `[GĐ3] Def errors Home: opponent×${defHomeMult.toFixed(3)}` });
  } else {
    skipped.push(4);
  }

  if (config.modules.includes(7)) {
    const rqiHome = squadDepthRQI(inputs.home_sub_ratings, inputs.home_starter_avg_score, inputs.home_subs_used);
    const rqiAway = squadDepthRQI(inputs.away_sub_ratings, inputs.away_starter_avg_score, inputs.away_subs_used);
    rqiHomeFactor = 0.5 + 0.5 * rqiHome.rqi;
    rqiAwayFactor = 0.5 + 0.5 * rqiAway.rqi;
    factors.push({ factor: rqiHomeFactor, detail: `[GĐ3] RQI Home: ${rqiHome.rqi.toFixed(3)} -> factor×${rqiHomeFactor.toFixed(3)}` });
    factors.push({ factor: rqiAwayFactor, detail: `[GĐ3] RQI Away: ${rqiAway.rqi.toFixed(3)} -> factor×${rqiAwayFactor.toFixed(3)}` });
  } else {
    skipped.push(7);
  }

  if (config.modules.includes(8)) {
    const tss = tacticalSynergy(inputs.home_tactical_style, inputs.away_tactical_style);
    tssHomeBonus = tss.home_bonus;
    tssAwayBonus = tss.away_bonus;
    factors.push({ factor: tssHomeBonus, detail: `[GĐ3] TSS ${tss.matchup}: home×${tssHomeBonus.toFixed(2)} away×${tssAwayBonus.toFixed(2)}` });
  } else {
    skipped.push(8);
  }

  if (config.modules.includes(9)) {
    wpf = weatherPitchFactor(inputs.weather);
    factors.push({ factor: wpf, detail: `[GĐ3] WPF ${inputs.weather}: ×${wpf.toFixed(2)}` });
  } else {
    skipped.push(9);
  }

  // Module 5 (set-piece) runs at GĐ1 and GĐ3 (computed once, reused)
  const sp = setPieceEdge(inputs.home_set_piece, inputs.away_set_piece);
  if (config.phase === 'GĐ1' || config.phase === 'GĐ3') {
    spHomeAdd = Math.max(0, sp.home_sp_net) * 0.5;
    spAwayAdd = Math.max(0, sp.away_sp_net) * 0.5;
    factors.push({ factor: sp.sp_edge, detail: `[${config.phase}] SP Edge: ${sp.sp_edge.toFixed(3)} homeAdd=${spHomeAdd.toFixed(3)} awayAdd=${spAwayAdd.toFixed(3)}` });
  }

  // LFI (module 11) — ONLY at GĐ3, and only if lineup is verified
  let lfiComputed = false;
  let lineupVerified: boolean | null = null;

  if (config.lfiEnabled) {
    if (runInputs.lineup?.verified) {
      lineupVerified = true;
      const lfiHome = matchFatigueLFI(inputs.home_player_minutes, matchISO);
      const lfiAway = matchFatigueLFI(inputs.away_player_minutes, matchISO);
      lfiHomeFactor = lfiHome.lfi;
      lfiAwayFactor = lfiAway.lfi;
      lfiComputed = true;
      factors.push({ factor: lfiHomeFactor, detail: `[GĐ3] LFI Home: ${lfiHomeFactor.toFixed(3)} (7d=${lfiHome.minutes_7d}min, 14d=${lfiHome.minutes_14d}min)` });
      factors.push({ factor: lfiAwayFactor, detail: `[GĐ3] LFI Away: ${lfiAwayFactor.toFixed(3)} (7d=${lfiAway.minutes_7d}min, 14d=${lfiAway.minutes_14d}min)` });
    } else {
      lineupVerified = runInputs.lineup?.verified ?? false;
      factors.push({ factor: 1, detail: `[GĐ3] LFI CHƯA TÍNH — BTC chưa công bố Official Lineup` });
      skipped.push(11);
    }
  } else {
    lineupVerified = null;
    skipped.push(11);
    factors.push({ factor: 1, detail: `[${config.phase}] LFI bỏ qua — chưa đến giai đoạn T-1h` });
  }

  // ---- Assemble final xG ----
  const homeBaseAttack = homeXG.xg_for * ha.home_factor;
  const awayBaseAttack = awayXG.xg_for * ha.away_factor;

  const homeAttack =
    homeBaseAttack * h2hHomeFactor * defAwayMult * motHomeFactor *
    rqiHomeFactor * tssHomeBonus * wpf * lfiHomeFactor;

  const awayAttack =
    awayBaseAttack * h2hAwayFactor * defHomeMult * motAwayFactor *
    rqiAwayFactor * tssAwayBonus * wpf * lfiAwayFactor;

  const finalHomeXG = Math.max(0.1, homeAttack + spHomeAdd);
  const finalAwayXG = Math.max(0.1, awayAttack + spAwayAdd);

  const poisson = poissonProbabilities(finalHomeXG, finalAwayXG);

  // ---- GĐ2: odds movement ----
  let oddsMovement: OddsMovement | undefined;
  if (runInputs.phase === 'GĐ2' && runInputs.oddsOpening && runInputs.oddsCurrent) {
    oddsMovement = detectOddsMovement(runInputs.oddsOpening, runInputs.oddsCurrent);
    factors.push({ factor: oddsMovement.edge, detail: `[GĐ2] Odds Movement: smartMoney=${oddsMovement.smart_money_shift} trap=${oddsMovement.odds_trap_warning} edge=${oddsMovement.edge.toFixed(4)}` });
  }

  // ---- GĐ3: circuit breaker + budget ----
  let circuitBreaker: CircuitBreaker | undefined;
  let budget: BudgetAllocation | undefined;
  if (runInputs.phase === 'GĐ3') {
    circuitBreaker = checkCircuitBreaker(
      runInputs.lineup ?? { verified: false, home_starters: [], away_starters: [], verified_at: null },
      runInputs.warmupInjuries ?? [],
    );
    if (circuitBreaker.triggered) {
      factors.push({ factor: 0, detail: `[GĐ3] CIRCUIT BREAKER: ${circuitBreaker.reason}` });
    }
    budget = { ...DEFAULT_BUDGET };
    factors.push({ factor: budget.tier1_main, detail: `[GĐ3] Ngân sách: T1=${budget.tier1_main} T2=${budget.tier2_backup} T3=${budget.tier3_parlay} T4=${budget.tier4_longshot} coin` });
  }

  return {
    phase: config.phase,
    label: config.label,
    home_xg: finalHomeXG,
    away_xg: finalAwayXG,
    factors,
    modules_run: config.modules,
    modules_skipped: skipped,
    lfi_computed: lfiComputed,
    lineup_verified: lineupVerified,
    ccri_alert: ccriAlert,
    ccri_tag: ccriTag,
    odds_movement: oddsMovement,
    budget,
    circuit_breaker: circuitBreaker,
    poisson,
  };
}

// ============================================================
// Convenience: run all 4 phases sequentially for a match
// ============================================================

export interface FullMatchRunInputs extends PhaseRunInputs {
  audit?: AuditInputs;
}

export interface FullMatchResult {
  phase1: PhaseResult;
  phase2: PhaseResult;
  phase3: PhaseResult;
  phase4: PhaseResult;
}

export function runAllPhases(baseInputs: FullMatchRunInputs): FullMatchResult {
  const phase1 = runPhase({
    ...baseInputs,
    phase: 'GĐ1',
  });

  const phase2 = runPhase({
    ...baseInputs,
    phase: 'GĐ2',
  });

  const phase3 = runPhase({
    ...baseInputs,
    phase: 'GĐ3',
  });

  let phase4: PhaseResult;
  if (baseInputs.audit) {
    const audit = runClosedLoopAudit(baseInputs.audit);
    phase4 = {
      phase: 'GĐ4',
      label: PHASE_CONFIGS['GĐ4'].label,
      home_xg: audit.actual_xg.home,
      away_xg: audit.actual_xg.away,
      factors: audit.root_causes.map((rc) => ({
        factor: 0,
        detail: `[GĐ4] ${rc.code}: ${rc.label} — ${rc.description}`,
      })),
      modules_run: [],
      modules_skipped: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      lfi_computed: false,
      lineup_verified: true,
      ccri_alert: false,
      ccri_tag: '',
      audit,
    };
  } else {
    phase4 = {
      phase: 'GĐ4',
      label: PHASE_CONFIGS['GĐ4'].label,
      home_xg: 0,
      away_xg: 0,
      factors: [{ factor: 0, detail: '[GĐ4] Chưa có dữ liệu FT — audit chưa chạy' }],
      modules_run: [],
      modules_skipped: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      lfi_computed: false,
      lineup_verified: null,
      ccri_alert: false,
      ccri_tag: '',
    };
  }

  return { phase1, phase2, phase3, phase4 };
}

// Re-export key types and formula helpers for callers
export type {
  MatchInputs,
  PoissonResult,
  FormulaFactor,
  Weather,
  RefereeStats,
  CardMarketLine,
  PlayerFatigueLog,
  TeamContextInput,
  TacticalStyle,
  MatchSlice,
  H2HMatchSlice,
  CoachH2HSlice,
  SetPieceSplit,
} from './formulas/types';
