import type { PlayerFatigueLog, CompetitionTier, FormulaFactor } from './types';

// Multi-competition Match Fatigue Index (LFI) integrating BOTH 7-day and 14-day windows.
//   LFI = 1.0 - [ 0.05 * (Minutes_7d / 900) + 0.03 * (Minutes_14d / 1800) ] * K_comp
// K_comp by competition tier:
//   EU Cup (C1/C2/C3) = 1.00, Top-5 league = 0.85, National Cup = 0.70, League Cup = 0.50

const W_7D = 0.05;
const W_14D = 0.03;
const MINUTES_7D_FULL = 900;
const MINUTES_14D_FULL = 1800;

export const COMPETITION_K: Record<CompetitionTier, number> = {
  EU_CUP: 1.0,
  TOP5: 0.85,
  NATIONAL_CUP: 0.7,
  LEAGUE_CUP: 0.5,
  OTHER: 0.85,
};

const DAY = 24 * 60 * 60 * 1000;

function minutesInWindow(logs: PlayerFatigueLog[], fromMs: number, toMs: number): { minutes: number; weightedMinutes: number } {
  let minutes = 0;
  let weighted = 0;
  for (const log of logs) {
    const t = new Date(log.played_at).getTime();
    if (t >= fromMs && t <= toMs) {
      minutes += log.minutes_played;
      weighted += log.minutes_played * (COMPETITION_K[log.competition_tier] ?? COMPETITION_K.OTHER);
    }
  }
  return { minutes, weightedMinutes: weighted };
}

export interface LFIResult {
  lfi: number;
  minutes_7d: number;
  minutes_14d: number;
  k_comp_avg: number;
}

export function matchFatigueLFI(
  playerLogs: PlayerFatigueLog[],
  matchISO: string,
): LFIResult {
  const matchMs = new Date(matchISO).getTime();
  const { minutes: min7d, weightedMinutes: w7d } = minutesInWindow(
    playerLogs,
    matchMs - 7 * DAY,
    matchMs,
  );
  const { minutes: min14d, weightedMinutes: w14d } = minutesInWindow(
    playerLogs,
    matchMs - 14 * DAY,
    matchMs,
  );

  // Average competition weight across both windows
  const totalMin = min7d + min14d;
  const kAvg = totalMin > 0 ? (w7d + w14d) / totalMin : COMPETITION_K.TOP5;

  const reduction =
    (W_7D * (w7d / MINUTES_7D_FULL) + W_14D * (w14d / MINUTES_14D_FULL)) * kAvg;

  // Clamp so LFI stays in [0.80, 1.00] — a team cannot lose more than 20% xG to fatigue
  const lfi = Math.max(0.8, Math.min(1.0, 1.0 - reduction));

  return { lfi, minutes_7d: min7d, minutes_14d: min14d, k_comp_avg: kAvg };
}

export function matchFatigueLFIFactor(
  playerLogs: PlayerFatigueLog[],
  matchISO: string,
): FormulaFactor {
  const r = matchFatigueLFI(playerLogs, matchISO);
  return {
    factor: r.lfi,
    detail: `LFI: ${r.lfi.toFixed(3)} (7d=${r.minutes_7d}min, 14d=${r.minutes_14d}min, kComp=${r.k_comp_avg.toFixed(2)})`,
  };
}
