import type { TacticalStyle, FormulaFactor } from './types';

// Tactical Synergy Score (TSS) along the GK-CB-CM-ST vertical axis.
//   High Pressing vs Low Block -> Home Bonus 1.05, Away 0.95
//   Possession vs Counter      -> Home Bonus 0.95, Away 1.08

const HIGH_PRESS_VS_LOW_BLOCK = { home: 1.05, away: 0.95 };
const POSSESSION_VS_COUNTER = { home: 0.95, away: 1.08 };

export interface TacticalSynergyResult {
  home_bonus: number;
  away_bonus: number;
  matchup: string;
}

export function tacticalSynergy(
  homeStyle: TacticalStyle,
  awayStyle: TacticalStyle,
): TacticalSynergyResult {
  const pair = `${homeStyle}:${awayStyle}`;

  if (
    (homeStyle === 'HIGH_PRESS' && awayStyle === 'LOW_BLOCK') ||
    (homeStyle === 'LOW_BLOCK' && awayStyle === 'HIGH_PRESS')
  ) {
    const isHomePress = homeStyle === 'HIGH_PRESS';
    return {
      home_bonus: isHomePress ? HIGH_PRESS_VS_LOW_BLOCK.home : HIGH_PRESS_VS_LOW_BLOCK.away,
      away_bonus: isHomePress ? HIGH_PRESS_VS_LOW_BLOCK.away : HIGH_PRESS_VS_LOW_BLOCK.home,
      matchup: 'High Press vs Low Block',
    };
  }

  if (
    (homeStyle === 'POSSESSION' && awayStyle === 'COUNTER') ||
    (homeStyle === 'COUNTER' && awayStyle === 'POSSESSION')
  ) {
    const isHomePoss = homeStyle === 'POSSESSION';
    return {
      home_bonus: isHomePoss ? POSSESSION_VS_COUNTER.home : POSSESSION_VS_COUNTER.away,
      away_bonus: isHomePoss ? POSSESSION_VS_COUNTER.away : POSSESSION_VS_COUNTER.home,
      matchup: 'Possession vs Counter',
    };
  }

  return { home_bonus: 1, away_bonus: 1, matchup: `Neutral (${pair})` };
}

export function tacticalSynergyFactor(
  homeStyle: TacticalStyle,
  awayStyle: TacticalStyle,
): FormulaFactor {
  const r = tacticalSynergy(homeStyle, awayStyle);
  return {
    factor: r.home_bonus,
    detail: `TSS ${r.matchup}: home×${r.home_bonus.toFixed(2)} away×${r.away_bonus.toFixed(2)}`,
  };
}
