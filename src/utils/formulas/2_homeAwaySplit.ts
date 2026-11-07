import type { FormulaFactor } from './types';

// Home/away advantage split (4 mathematical steps).
//   HomeAdvantage = LeagueHomeAvgXG / LeagueAwayAvgXG
//   Default = 1.45 / 1.15 = 1.2609
const DEFAULT_HOME_XG = 1.45;
const DEFAULT_AWAY_XG = 1.15;

export interface HomeAwaySplitResult {
  home_advantage: number;
  home_factor: number;
  away_factor: number;
}

export function homeAwaySplit(
  leagueHomeAvgXG: number = DEFAULT_HOME_XG,
  leagueAwayAvgXG: number = DEFAULT_AWAY_XG,
): HomeAwaySplitResult {
  // Step 1: raw ratio
  const ratio = leagueAwayAvgXG > 0 ? leagueHomeAvgXG / leagueAwayAvgXG : DEFAULT_HOME_XG / DEFAULT_AWAY_XG;
  // Step 2: normalise around 1.0 — home gets the surplus, away the inverse
  const homeAdvantage = ratio;
  // Step 3: square-root dampening so extremes don't blow up
  const damped = Math.sqrt(homeAdvantage);
  // Step 4: split into symmetric factors around 1.0
  const homeFactor = damped;
  const awayFactor = 1 / damped;

  return { home_advantage: homeAdvantage, home_factor: homeFactor, away_factor: awayFactor };
}

export function homeAwaySplitFactor(
  leagueHomeAvgXG?: number,
  leagueAwayAvgXG?: number,
): FormulaFactor {
  const r = homeAwaySplit(leagueHomeAvgXG, leagueAwayAvgXG);
  return {
    factor: r.home_factor,
    detail: `Home/Away split: homeAdv=${r.home_advantage.toFixed(3)} home×${r.home_factor.toFixed(3)} away×${r.away_factor.toFixed(3)}`,
  };
}
