import type {
  H2HMatchSlice,
  CoachH2HSlice,
  FormulaFactor,
} from './types';

// H2H 3-Dimension matrix with time-decay.
//   Dim 1: Club vs Club (time-decay 50/30/20)
//   Dim 2: Manager vs Manager at current club
//   Dim 3: Manager vs Manager across whole career
//   Impact = 0.05 * NetDiff_weighted + 0.05 * (HomeMgrWinRate - AwayMgrWinRate)
//   homeH2HFactor = clamp(1.0 + Impact, 0.85, 1.15)
//   awayH2HFactor = clamp(1.0 - Impact, 0.85, 1.15)

const W_RECENT = 0.5;
const W_MID = 0.3;
const W_OLD = 0.2;
const RECENT_N = 5;
const MID_N = 10;
const IMPACT_NET = 0.05;
const IMPACT_MGR = 0.05;
const CLAMP_MIN = 0.85;
const CLAMP_MAX = 1.15;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Dim 1 — club vs club, from the home team's perspective (goal diff).
function clubNetDiffWeighted(slices: H2HMatchSlice[], homeTeam: string): number {
  if (slices.length === 0) return 0;
  const weighted = (group: H2HMatchSlice[]) => {
    if (group.length === 0) return 0;
    let total = 0;
    for (const s of group) {
      const isHome = s.home_team === homeTeam;
      const diff = isHome ? s.home_score - s.away_score : s.away_score - s.home_score;
      total += diff;
    }
    return total / group.length;
  };
  const recent = weighted(slices.slice(0, RECENT_N));
  const mid = weighted(slices.slice(RECENT_N, MID_N));
  const old = weighted(slices.slice(MID_N));
  return W_RECENT * recent + W_MID * mid + W_OLD * old;
}

function mgrWinRate(slices: CoachH2HSlice[], manager: string): number {
  if (slices.length === 0) return 0.5;
  let wins = 0;
  for (const s of slices) {
    if (s.manager_a === manager) {
      if (s.manager_a_score > s.manager_b_score) wins++;
    } else if (s.manager_b === manager) {
      if (s.manager_b_score > s.manager_a_score) wins++;
    }
  }
  const relevant = slices.filter(
    (s) => s.manager_a === manager || s.manager_b === manager,
  );
  return relevant.length ? wins / relevant.length : 0.5;
}

export interface H2H3DResult {
  impact: number;
  home_factor: number;
  away_factor: number;
  net_diff_weighted: number;
  home_mgr_win_rate: number;
  away_mgr_win_rate: number;
}

export function h2h3DMatrix(
  clubSlices: H2HMatchSlice[],
  currentClubSlices: CoachH2HSlice[],
  careerSlices: CoachH2HSlice[],
  homeTeam: string,
  homeManager: string,
  awayManager: string,
): H2H3DResult {
  const netDiffWeighted = clubNetDiffWeighted(clubSlices, homeTeam);

  // Dim 2 weighted by recency within current-club slices, Dim 3 career average.
  const homeMgrCurrent = mgrWinRate(currentClubSlices, homeManager);
  const awayMgrCurrent = mgrWinRate(currentClubSlices, awayManager);
  const homeMgrCareer = mgrWinRate(careerSlices, homeManager);
  const awayMgrCareer = mgrWinRate(careerSlices, awayManager);
  // Blend current-club (70%) with career (30%) for the manager win-rate delta.
  const homeMgrRate = 0.7 * homeMgrCurrent + 0.3 * homeMgrCareer;
  const awayMgrRate = 0.7 * awayMgrCurrent + 0.3 * awayMgrCareer;

  const impact =
    IMPACT_NET * netDiffWeighted + IMPACT_MGR * (homeMgrRate - awayMgrRate);

  return {
    impact,
    home_factor: clamp(1 + impact, CLAMP_MIN, CLAMP_MAX),
    away_factor: clamp(1 - impact, CLAMP_MIN, CLAMP_MAX),
    net_diff_weighted: netDiffWeighted,
    home_mgr_win_rate: homeMgrRate,
    away_mgr_win_rate: awayMgrRate,
  };
}

export function h2h3DFactor(
  clubSlices: H2HMatchSlice[],
  currentClubSlices: CoachH2HSlice[],
  careerSlices: CoachH2HSlice[],
  homeTeam: string,
  homeManager: string,
  awayManager: string,
): FormulaFactor {
  const r = h2h3DMatrix(clubSlices, currentClubSlices, careerSlices, homeTeam, homeManager, awayManager);
  return {
    factor: r.home_factor,
    detail: `H2H 3D: impact=${r.impact.toFixed(4)} home×${r.home_factor.toFixed(3)} away×${r.away_factor.toFixed(3)}`,
  };
}
