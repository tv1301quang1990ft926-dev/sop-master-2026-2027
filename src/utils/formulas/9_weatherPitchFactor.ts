import type { Weather, FormulaFactor } from './types';

// Weather Pitch Factor (WPF).
//   RAIN = 0.90, SNOW = 0.85, BAD_PITCH = 0.88, NORMAL = 1.00
// Rain/snow cuts xG by 10-15%.

export const WEATHER_FACTOR: Record<Weather, number> = {
  RAIN: 0.9,
  SNOW: 0.85,
  BAD_PITCH: 0.88,
  NORMAL: 1.0,
};

export function weatherPitchFactor(weather: Weather): number {
  return WEATHER_FACTOR[weather] ?? 1.0;
}

export function weatherPitchFactorDetail(weather: Weather): FormulaFactor {
  const f = weatherPitchFactor(weather);
  return {
    factor: f,
    detail: `WPF ${weather}: ×${f.toFixed(2)}`,
  };
}
