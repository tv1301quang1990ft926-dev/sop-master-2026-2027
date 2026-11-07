import type { SetPieceSplit, MatchSlice, FormulaFactor } from './types';

// Set-piece edge with time-decay across the 2026-2027 season.
//   SP_Edge = (SP_xG_Att - SP_xGA_Def)_Home - (SP_xG_Att - SP_xGA_Def)_Away
// When per-match slices are provided we recompute the attack/defence splits
// with the 50/30/20 time-decay; otherwise we fall back to the scalar averages.

const W_RECENT = 0.5;
const W_MID = 0.3;
const W_OLD = 0.2;
const RECENT_N = 5;
const MID_N = 10;

function decayAvg(slices: MatchSlice[] | undefined, pick: (s: MatchSlice) => number): number {
  if (!slices || slices.length === 0) return 0;
  const avg = (g: MatchSlice[]) => (g.length ? g.reduce((s, m) => s + pick(m), 0) / g.length : 0);
  return (
    W_RECENT * avg(slices.slice(0, RECENT_N)) +
    W_MID * avg(slices.slice(RECENT_N, MID_N)) +
    W_OLD * avg(slices.slice(MID_N))
  );
}

export interface SetPieceEdgeResult {
  sp_edge: number;
  home_sp_net: number;
  away_sp_net: number;
}

export function setPieceEdge(home: SetPieceSplit, away: SetPieceSplit): SetPieceEdgeResult {
  const homeAtt = home.slices ? decayAvg(home.slices, (s) => s.xG_for) : home.sp_xg_att;
  const homeDef = home.slices ? decayAvg(home.slices, (s) => s.xG_against) : home.sp_xga_def;
  const awayAtt = away.slices ? decayAvg(away.slices, (s) => s.xG_for) : away.sp_xg_att;
  const awayDef = away.slices ? decayAvg(away.slices, (s) => s.xG_against) : away.sp_xga_def;

  const homeNet = homeAtt - homeDef;
  const awayNet = awayAtt - awayDef;
  return { sp_edge: homeNet - awayNet, home_sp_net: homeNet, away_sp_net: awayNet };
}

export function setPieceEdgeFactor(home: SetPieceSplit, away: SetPieceSplit): FormulaFactor {
  const r = setPieceEdge(home, away);
  return {
    factor: r.sp_edge,
    detail: `SP Edge: homeNet=${r.home_sp_net.toFixed(3)} awayNet=${r.away_sp_net.toFixed(3)} edge=${r.sp_edge.toFixed(3)}`,
  };
}
