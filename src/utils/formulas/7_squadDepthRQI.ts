import type { FormulaFactor } from './types';

// Replacement Quality Index (RQI).
//   RQI = (Sum of SubScores) / (k * StarterAvgScore)
// k = number of subs used. When k = 0, RQI defaults to 1.0 (no adjustment).

export interface RQIResult {
  rqi: number;
  sub_sum: number;
  subs_used: number;
}

export function squadDepthRQI(
  subScores: number[],
  starterAvgScore: number,
  subsUsed?: number,
): RQIResult {
  const k = subsUsed ?? subScores.length;
  if (k <= 0 || starterAvgScore <= 0) return { rqi: 1, sub_sum: 0, subs_used: k };
  const subSum = subScores.reduce((s, v) => s + v, 0);
  return { rqi: subSum / (k * starterAvgScore), sub_sum: subSum, subs_used: k };
}

export function squadDepthRQIFactor(
  subScores: number[],
  starterAvgScore: number,
  subsUsed?: number,
): FormulaFactor {
  const r = squadDepthRQI(subScores, starterAvgScore, subsUsed);
  return {
    factor: r.rqi,
    detail: `RQI: ${r.rqi.toFixed(3)} (subSum=${r.sub_sum.toFixed(2)}, k=${r.subs_used}, starterAvg=${starterAvgScore.toFixed(2)})`,
  };
}
