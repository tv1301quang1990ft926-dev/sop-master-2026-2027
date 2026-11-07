import type { FormulaFactor } from './types';

// Defensive errors & player props penalty.
//   DefensivePenalty = 0.04 * DefensiveErrors + (KeyFoulsAvg > 2.0 ? 0.05 : 0)
// The penalty reduces the opposing attacker's xG suppression, i.e. it inflates
// the attack of the team facing a leaky defence. We expose it as a multiplier
// applied to the *opponent's* xG.

const ERR_WEIGHT = 0.04;
const KEY_FOULS_THRESHOLD = 2.0;
const KEY_FOULS_BONUS = 0.05;

export interface DefensiveErrorsResult {
  penalty: number;
  opponent_multiplier: number; // 1 + penalty — apply to the facing attack
}

export function defensiveErrors(
  errorCount: number,
  keyFoulsAvg: number,
): DefensiveErrorsResult {
  const penalty =
    ERR_WEIGHT * errorCount +
    (keyFoulsAvg > KEY_FOULS_THRESHOLD ? KEY_FOULS_BONUS : 0);
  return { penalty, opponent_multiplier: 1 + penalty };
}

export function defensiveErrorsFactor(
  errorCount: number,
  keyFoulsAvg: number,
): FormulaFactor {
  const r = defensiveErrors(errorCount, keyFoulsAvg);
  return {
    factor: r.opponent_multiplier,
    detail: `Defensive penalty: ${r.penalty.toFixed(3)} (errors=${errorCount}, keyFouls=${keyFoulsAvg.toFixed(2)})`,
  };
}
