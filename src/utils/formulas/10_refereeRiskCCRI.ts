import type { RefereeStats, CardMarketLine, FormulaFactor } from './types';

// Referee Card Congestion Risk Index (CCRI) with multi-directional check
// against the card market line.
//   CCRI = 0.6 * Yellow_Ref + 1.5 * Red_Ref + 0.4 * (Fouls_Home + Fouls_Away)
// If CCRI >= 7.5 OR |CCRI - cardLine| >= 1.0 -> tag '[CẢNH BÁO KÈO THẺ VALUE]'
// and recommend OVER_CARDS / UNDER_CARDS.

const CCRI_ALERT = 7.5;
const EDGE_ALERT = 1.0;
const W_YELLOW = 0.6;
const W_RED = 1.5;
const W_FOULS = 0.4;

export type CardRecommendation = 'OVER_CARDS' | 'UNDER_CARDS' | 'NO_VALUE';

export interface CCRIResult {
  ccri: number;
  edge: number;            // CCRI - market line (positive => expect more cards)
  alert: boolean;
  recommendation: CardRecommendation;
  tag: string;
}

export function refereeRiskCCRI(
  ref: RefereeStats,
  cardLine: CardMarketLine | null | undefined,
): CCRIResult {
  const ccri =
    W_YELLOW * ref.yellow_per_match +
    W_RED * ref.red_per_match +
    W_FOULS * (ref.fouls_home_avg + ref.fouls_away_avg);

  const line = cardLine?.line_over_under ?? 0;
  const edge = line > 0 ? ccri - line : 0;
  const alert = ccri >= CCRI_ALERT || Math.abs(edge) >= EDGE_ALERT;

  let recommendation: CardRecommendation = 'NO_VALUE';
  if (alert) {
    recommendation = edge >= 0 ? 'OVER_CARDS' : 'UNDER_CARDS';
  }
  const tag = alert ? '[CẢNH BÁO KÈO THẺ VALUE]' : '';

  return { ccri, edge, alert, recommendation, tag };
}

export function refereeRiskCCRIFactor(
  ref: RefereeStats,
  cardLine?: CardMarketLine | null,
): FormulaFactor {
  const r = refereeRiskCCRI(ref, cardLine);
  return {
    factor: r.ccri,
    detail: `CCRI=${r.ccri.toFixed(2)} edge=${r.edge.toFixed(2)} ${r.tag} -> ${r.recommendation}`,
  };
}
