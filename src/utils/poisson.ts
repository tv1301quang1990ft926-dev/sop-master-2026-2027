// Poisson orchestrator — assembles the 11 quant-engine modules into final
// home/away expected goals, then derives the 1X2 probability matrix and most
// likely scorelines via the independent Poisson model.
//
// Pipeline:
//   1. xG time-decay (Rule 3)  -> base xG for/against
//   2. Home/away split         -> home/away multipliers
//   3. H2H 3D matrix           -> clamp 0.85-1.15 factors
//   4. Defensive errors        -> opponent inflation (1 + penalty)
//   5. Set-piece edge          -> additive xG adjustment
//   6. Motivation trigger      -> +15% / +20% multiplier
//   7. Squad depth RQI         -> bench quality multiplier
//   8. Tactical synergy TSS    -> style matchup bonus
//   9. Weather/pitch WPF       -> global xG dampener
//  10. Referee CCRI            -> card value flag (informational)
//  11. Fatigue LFI             -> 7d + 14d window dampener
//
// Final:
//   home_xG = baseFor_home * homeFactor * h2hHome * defOppAway * motivationHome
//             * rqiHome * tssHome * wpf * lfiHome + spEdgeHome
//   away_xG = baseFor_away * awayFactor * h2hAway * defOppHome * motivationAway
//             * rqiAway * tssAway * wpf * lfiAway + spEdgeAway

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
} from './formulas/types';

const MAX_GOALS = 8; // scoreline grid 0..MAX_GOALS

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonPmf(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export interface PoissonBreakdown {
  home_xg: number;
  away_xg: number;
  factors: FormulaFactor[];
  ccri_alert: boolean;
  ccri_tag: string;
}

export function computePoisson(inputs: MatchInputs, matchISO: string): PoissonBreakdown {
  const factors: FormulaFactor[] = [];

  // 1. xG time-decay
  const homeXG = xgWeighted(inputs.home_slices);
  const awayXG = xgWeighted(inputs.away_slices);
  factors.push({
    factor: homeXG.xg_for,
    detail: `xG decay Home: for=${homeXG.xg_for.toFixed(3)} against=${homeXG.xg_against.toFixed(3)}`,
  });
  factors.push({
    factor: awayXG.xg_for,
    detail: `xG decay Away: for=${awayXG.xg_for.toFixed(3)} against=${awayXG.xg_against.toFixed(3)}`,
  });

  // 2. Home/away split
  const ha = homeAwaySplit(inputs.league_home_avg_xg, inputs.league_away_avg_xg);
  factors.push({
    factor: ha.home_factor,
    detail: `Home/Away: home×${ha.home_factor.toFixed(3)} away×${ha.away_factor.toFixed(3)}`,
  });

  // 3. H2H 3D matrix
  const h2h = h2h3DMatrix(
    inputs.h2h_club_slices,
    inputs.h2h_current_club,
    inputs.h2h_career,
    inputs.home_context.team_id,
    inputs.home_manager,
    inputs.away_manager,
  );
  factors.push({
    factor: h2h.home_factor,
    detail: `H2H 3D: home×${h2h.home_factor.toFixed(3)} away×${h2h.away_factor.toFixed(3)} impact=${h2h.impact.toFixed(4)}`,
  });

  // 4. Defensive errors — opponent's defence inflates this attack
  const defAway = defensiveErrors(inputs.away_defensive_errors, inputs.away_key_fouls_avg);
  const defHome = defensiveErrors(inputs.home_defensive_errors, inputs.home_key_fouls_avg);
  factors.push({
    factor: defAway.opponent_multiplier,
    detail: `Def errors Away: opponent×${defAway.opponent_multiplier.toFixed(3)}`,
  });
  factors.push({
    factor: defHome.opponent_multiplier,
    detail: `Def errors Home: opponent×${defHome.opponent_multiplier.toFixed(3)}`,
  });

  // 5. Set-piece edge
  const sp = setPieceEdge(inputs.home_set_piece, inputs.away_set_piece);
  factors.push({
    factor: sp.sp_edge,
    detail: `SP Edge: ${sp.sp_edge.toFixed(3)} (homeNet=${sp.home_sp_net.toFixed(3)} awayNet=${sp.away_sp_net.toFixed(3)})`,
  });

  // 6. Motivation trigger
  const motHome = motivationTrigger(inputs.home_context);
  const motAway = motivationTrigger(inputs.away_context);
  factors.push({ factor: motHome.factor, detail: `Motivation Home: ${motHome.reason}` });
  factors.push({ factor: motAway.factor, detail: `Motivation Away: ${motAway.reason}` });

  // 7. Squad depth RQI
  const rqiHome = squadDepthRQI(inputs.home_sub_ratings, inputs.home_starter_avg_score, inputs.home_subs_used);
  const rqiAway = squadDepthRQI(inputs.away_sub_ratings, inputs.away_starter_avg_score, inputs.away_subs_used);
  factors.push({ factor: rqiHome.rqi, detail: `RQI Home: ${rqiHome.rqi.toFixed(3)}` });
  factors.push({ factor: rqiAway.rqi, detail: `RQI Away: ${rqiAway.rqi.toFixed(3)}` });

  // 8. Tactical synergy
  const tss = tacticalSynergy(inputs.home_tactical_style, inputs.away_tactical_style);
  factors.push({
    factor: tss.home_bonus,
    detail: `TSS ${tss.matchup}: home×${tss.home_bonus.toFixed(2)} away×${tss.away_bonus.toFixed(2)}`,
  });

  // 9. Weather / pitch
  const wpf = weatherPitchFactor(inputs.weather);
  factors.push({ factor: wpf, detail: `WPF ${inputs.weather}: ×${wpf.toFixed(2)}` });

  // 10. Referee CCRI (informational — does not move xG)
  const ccri = refereeRiskCCRI(inputs.referee, inputs.card_line ?? null);
  factors.push({
    factor: ccri.ccri,
    detail: `CCRI=${ccri.ccri.toFixed(2)} ${ccri.tag} -> ${ccri.recommendation}`,
  });

  // 11. Fatigue LFI
  const lfiHome = matchFatigueLFI(inputs.home_player_minutes, matchISO);
  const lfiAway = matchFatigueLFI(inputs.away_player_minutes, matchISO);
  factors.push({ factor: lfiHome.lfi, detail: `LFI Home: ${lfiHome.lfi.toFixed(3)} (7d=${lfiHome.minutes_7d}min)` });
  factors.push({ factor: lfiAway.lfi, detail: `LFI Away: ${lfiAway.lfi.toFixed(3)} (7d=${lfiAway.minutes_7d}min)` });

  // ---- Assemble final xG ----
  // Base attack uses time-decayed xG_for scaled by the home/away split.
  const homeBaseAttack = homeXG.xg_for * ha.home_factor;
  const awayBaseAttack = awayXG.xg_for * ha.away_factor;

  // H2H factor adjusts each side; defensive penalty of the opponent inflates attack.
  const homeAttack =
    homeBaseAttack *
    h2h.home_factor *
    defAway.opponent_multiplier *
    motHome.factor *
    (0.5 + 0.5 * rqiHome.rqi) * // RQI centred at 1.0
    tss.home_bonus *
    wpf *
    lfiHome.lfi;

  const awayAttack =
    awayBaseAttack *
    h2h.away_factor *
    defHome.opponent_multiplier *
    motAway.factor *
    (0.5 + 0.5 * rqiAway.rqi) *
    tss.away_bonus *
    wpf *
    lfiAway.lfi;

  // Set-piece edge is additive (already a net xG delta).
  const spHomeAdd = Math.max(0, sp.home_sp_net) * 0.5;
  const spAwayAdd = Math.max(0, sp.away_sp_net) * 0.5;

  const finalHomeXG = Math.max(0.1, homeAttack + spHomeAdd);
  const finalAwayXG = Math.max(0.1, awayAttack + spAwayAdd);

  return {
    home_xg: finalHomeXG,
    away_xg: finalAwayXG,
    factors,
    ccri_alert: ccri.alert,
    ccri_tag: ccri.tag,
  };
}

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
