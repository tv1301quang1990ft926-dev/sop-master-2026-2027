import type { TeamContextInput, FormulaFactor } from './types';

// Motivation trigger for both title-race and relegation battles.
//   Top-8 / Europe race: competitor lost -> Motivation_Factor = 1.15 (+15% xG)
//   Relegation fight (Bottom 4/5): underdog rival won -> Motivation_Factor = 1.20 (+20% xG)
// Relegation thresholds:
//   20-team league (EPL, La Liga, Serie A): bottom 3 (18,19,20) direct + play-off band 16-17
//   18-team league (Bundesliga, Ligue 1): bottom 2 (17,18) direct + play-off 16
// Europe Cup 2026-2027 League Phase (36 teams):
//   Top 8 -> direct R16; 9-24 -> play-off R32; 25-36 -> eliminated.

const TITLE_FACTOR = 1.15;
const SURVIVAL_FACTOR = 1.20;
const EU_DIRECT_SAFE = 8;
const EU_PLAYOFF_MAX = 24;

export interface MotivationResult {
  factor: number;
  triggered: boolean;
  reason: string;
}

function inRelegationZone(ctx: TeamContextInput): boolean {
  const size = ctx.league_size;
  const pos = ctx.current_position;
  if (size === 20) return pos >= 18; // 18,19,20
  if (size === 18) return pos >= 17; // 17,18
  return false;
}

function inRelegationPlayoff(ctx: TeamContextInput): boolean {
  return ctx.league_size === 20
    ? ctx.current_position === 16 || ctx.current_position === 17
    : ctx.league_size === 18 && ctx.current_position === 16;
}

function inEuropeFight(ctx: TeamContextInput): boolean {
  if (ctx.in_eu_cup_league_phase && ctx.eu_cup_phase_position != null) {
    // Racing for Top 8 direct entry in the League Phase
    return ctx.eu_cup_phase_position >= EU_DIRECT_SAFE && ctx.eu_cup_phase_position <= EU_PLAYOFF_MAX;
  }
  // Domestic top-4 / top-5 European qualification race
  return ctx.race === 'TOP_EUROPE';
}

export function motivationTrigger(ctx: TeamContextInput): MotivationResult {
  // Title / Europe race
  if (inEuropeFight(ctx)) {
    if (ctx.competitor_results_this_round === 'LOST') {
      return { factor: TITLE_FACTOR, triggered: true, reason: 'Đua Top Châu Âu: đối thủ cạnh tranh thua -> +15% xG' };
    }
    return { factor: 1, triggered: false, reason: 'Đua Top Châu Âu: chưa kích hoạt' };
  }

  // Relegation fight — both direct drop and play-off band count as survival mode
  if (inRelegationZone(ctx) || inRelegationPlayoff(ctx)) {
    if (ctx.competitor_results_this_round === 'WON') {
      return { factor: SURVIVAL_FACTOR, triggered: true, reason: 'Đua Trụ Hạng sinh tử: đối thủ nhóm dưới thắng -> +20% xG' };
    }
    return { factor: 1, triggered: false, reason: 'Đua Trụ Hạng: chưa kích hoạt' };
  }

  return { factor: 1, triggered: false, reason: 'Không nằm trong vùng trigger động lực' };
}

export function motivationTriggerFactor(ctx: TeamContextInput): FormulaFactor {
  const r = motivationTrigger(ctx);
  return { factor: r.factor, detail: r.reason };
}
