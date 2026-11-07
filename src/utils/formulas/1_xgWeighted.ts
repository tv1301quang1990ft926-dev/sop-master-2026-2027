import type { MatchSlice, FormulaFactor } from './types';

// Rule 3 — Time-decay weighted xG across the 2026-2027 season.
//   xG_weighted = 0.50 * xG_(1-5) + 0.30 * xG_(6-10) + 0.20 * xG_(11+)
// Slices are sorted most-recent-first.

const WEIGHT_RECENT = 0.5;   // matches 1-5
const WEIGHT_MID = 0.3;      // matches 6-10
const WEIGHT_OLD = 0.2;      // matches 11+
const WINDOW_RECENT = 5;
const WINDOW_MID = 10;

export function weightedXGFor(slices: MatchSlice[]): number {
  if (slices.length === 0) return 0;
  const recent = slices.slice(0, WINDOW_RECENT);
  const mid = slices.slice(WINDOW_RECENT, WINDOW_MID);
  const old = slices.slice(WINDOW_MID);

  const avg = (arr: MatchSlice[]) =>
    arr.length ? arr.reduce((s, m) => s + m.xG_for, 0) / arr.length : 0;

  return WEIGHT_RECENT * avg(recent) + WEIGHT_MID * avg(mid) + WEIGHT_OLD * avg(old);
}

export function weightedXGAgainst(slices: MatchSlice[]): number {
  if (slices.length === 0) return 0;
  const recent = slices.slice(0, WINDOW_RECENT);
  const mid = slices.slice(WINDOW_RECENT, WINDOW_MID);
  const old = slices.slice(WINDOW_MID);

  const avg = (arr: MatchSlice[]) =>
    arr.length ? arr.reduce((s, m) => s + m.xG_against, 0) / arr.length : 0;

  return WEIGHT_RECENT * avg(recent) + WEIGHT_MID * avg(mid) + WEIGHT_OLD * avg(old);
}

export interface XGWeightedResult {
  xg_for: number;
  xg_against: number;
}

export function xgWeighted(slices: MatchSlice[]): XGWeightedResult {
  return {
    xg_for: weightedXGFor(slices),
    xg_against: weightedXGAgainst(slices),
  };
}

export function xgWeightedFactor(slices: MatchSlice[]): FormulaFactor {
  const r = xgWeighted(slices);
  return {
    factor: r.xg_for,
    detail: `xG time-decay (50/30/20): for=${r.xg_for.toFixed(3)} against=${r.xg_against.toFixed(3)} (n=${slices.length})`,
  };
}
