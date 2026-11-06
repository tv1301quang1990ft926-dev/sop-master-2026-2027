import React, { useState } from 'react';
import { AlertTriangle, Activity, DollarSign, X, ShieldAlert, Zap, Clock } from 'lucide-react';

export interface TrackingMatchItem {
  match_id: string;
  giai_dau?: string;
  league_name?: string;
  tran_dau?: string;
  home_team?: string;
  away_team?: string;
  home_logo?: string;
  away_logo?: string;
  kickoff_time?: string;
  gio_thi_dau_gmt7?: string;
  
  // Tỷ lệ 1X2 Châu Âu
  odds_home_1x2?: number;
  odds_draw_1x2?: number;
  odds_away_1x2?: number;

  // Tỷ lệ Baseline GĐ1
  handicap_opening?: number;
  odds_home_opening?: number;
  odds_away_opening?: number;
  overunder_opening?: number;
  odds_over_opening?: number;
  odds_under_opening?: number;

  // Biến động Live T-3h GĐ2
  handicap_current_t3h?: number;
  odds_home_t3h?: number;
  odds_away_t3h?: number;
  overunder_current_t3h?: number;
  odds_over_t3h?: number;
  odds_under_t3h?: number;

  // Tín hiệu GĐ2
  expected_edge_t3h?: number;
  smart_money_signal?: string;
  trap_odds_warning?: string;
}

interface MatchCardStage2Props {
  match: TrackingMatchItem;
}

function formatOdds(val?: number | null): string {
  return val === null || val === undefined ? '--' : val.toFixed(2);
}

function formatHandicap(val?: number | null, isAway: boolean = false): string {
  if (val === null || val === undefined) return '--';
  const finalVal = isAway ? -val : val;
  return finalVal > 0 ? `+${finalVal.toFixed(2)}` : finalVal.toFixed(2);
}

export default function MatchCardStage2({ match }: MatchCardStage2Props) {
  const [activeModal, setActiveModal] = useState<'TRAP_ODDS' | 'ODDS_MOVEMENT' | 'SMART_MONEY' | null>(null);

  const league = match.giai_dau || match.league_name || 'BÓNG ĐÁ TOP 8';
  const homeName = match.home_team || match.tran_dau?.split(' vs ')[0] || 'Đội nhà';
  const awayName = match.away_team || match.tran_dau?.split(' vs ')[1] || 'Đội khách';
  const kickoff = match.kickoff_time || match.gio_thi_dau_gmt7 || 'T-3h Live';

  const isTrap = match.trap_odds_warning?.toUpperCase().includes('BẪY') || match.trap_odds_warning?.toUpperCase().includes('BAY');
  const hasSmartMoney = Boolean(match.smart_money_signal && match.smart_money_signal !== 'NEUTRAL' && match.smart_money_signal !== 'Không');
  const edgeVal = match.expected_edge_t3h || 0.0;

  const currentHcap = match.handicap_current_t3h ?? match.handicap_opening ?? 0;
  const currentOU = match.overunder_current_t3h ?? match.overunder_opening ?? 2.5;

  return (
    <div className={`overflow-hidden rounded-2xl border ${
      isTrap ? 'border-rose-500/80 bg-[#1b202c] shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-slate-700 bg-[#1b202c]'
    } text-white shadow-lg p-4 mb-4 relative font-sans`}>
      
      {/* HEADER TRẬN ĐẤU (GIỮ 100% GĐ1) */}
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3 text-xs">
        <span className="font-bold text-slate-200 uppercase tracking-wider text-sm sm:text-base">
          {league}
        </span>
        <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-bold text-xs sm:text-sm">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{kickoff}</span>
        </div>
      </div>

      {/* KHUNG GRID 4 CỘT CHUẨN 100% GĐ1 */}
      <div className="grid grid-cols-[minmax(120px,1.2fr)_repeat(3,minmax(75px,1fr))] gap-2 items-center text-center text-xs">
        {/* Tên Cột */}
        <div className="text-left font-bold text-slate-400">Đội bóng</div>
        <div className="font-medium text-slate-300">Toàn Trận - 1X2</div>
        <div className="font-medium text-slate-300">Toàn Trận - Chấp</div>
        <div className="font-medium text-slate-300">Toàn Trận - T/X</div>

        {/* HÀNG 1: ĐỘI NHÀ */}
        <div className="flex items-center gap-2 text-left py-1.5 min-w-0">
          {match.home_logo ? (
            <img src={match.home_logo} alt="" className="h-6 w-6 object-contain shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-slate-700 shrink-0 flex items-center justify-center font-bold text-[10px]">H</div>
          )}
          <span className="font-bold text-sm text-white truncate">{homeName}</span>
        </div>
        {/* 1X2 Home */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <span className="text-[10px] text-slate-400 block">Đội nhà</span>
          <span className="font-bold text-sm text-white">{formatOdds(match.odds_home_1x2 || 1.85)}</span>
        </div>
        {/* Handicap Home */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <span className="text-[10px] text-slate-400 block">{formatHandicap(currentHcap, false)}</span>
          <span className="font-bold text-sm text-white">{formatOdds(match.odds_home_t3h || match.odds_home_opening || 0.92)}</span>
        </div>
        {/* Over/Under Over */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <span className="text-[10px] text-slate-400 block">o {currentOU}</span>
          <span className="font-bold text-sm text-white">{formatOdds(match.odds_over_t3h || match.odds_over_opening || 0.88)}</span>
        </div>

        {/* HÀNG 2: ĐỘI KHÁCH */}
        <div className="flex items-center gap-2 text-left py-1.5 min-w-0">
          {match.away_logo ? (
            <img src={match.away_logo} alt="" className="h-6 w-6 object-contain shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-slate-700 shrink-0 flex items-center justify-center font-bold text-[10px]">A</div>
          )}
          <span className="font-bold text-sm text-white truncate">{awayName}</span>
        </div>
        {/* 1X2 Away */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <span className="text-[10px] text-slate-400 block">Đội khách</span>
          <span className="font-bold text-sm text-white">{formatOdds(match.odds_away_1x2 || 4.20)}</span>
        </div>
        {/* Handicap Away (ĐẢO DẤU CHUẨN) */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <span className="text-[10px] text-slate-400 block">{formatHandicap(currentHcap, true)}</span>
          <span className="font-bold text-sm text-white">{formatOdds(match.odds_away_t3h || match.odds_away_opening || 0.90)}</span>
        </div>
        {/* Over/Under Under */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <span className="text-[10px] text-slate-400 block">u {currentOU}</span>
          <span className="font-bold text-sm text-white">{formatOdds(match.odds_under_t3h || match.odds_under_opening || 0.95)}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🎯 BỘ 3 NÚT BẤM GĐ2 XẾP TRÊN 1 HÀNG NGANG CHUẨN (GRID 3 CỘT) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/80">
        <button
          onClick={() => setActiveModal('TRAP_ODDS')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition cursor-pointer ${
            isTrap ? 'bg-rose-950/80 border-rose-500/80 text-rose-300' : 'bg-slate-800/90 border-slate-700 text-amber-400 hover:bg-slate-700'
          }`}
        >
          <div className="flex items-center gap-1">
            <AlertTriangle className={`h-3.5 w-3.5 ${isTrap ? 'animate-bounce text-rose-400' : 'text-amber-400'}`} />
            <span className="text-xs font-bold">{isTrap ? 'Bẫy Odds!' : 'Kiểm Bẫy Odds'}</span>
          </div>
        </button>

        <button
          onClick={() => setActiveModal('ODDS_MOVEMENT')}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-cyan-500/40 bg-slate-800/90 hover:bg-cyan-950/60 text-cyan-300 transition cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-bold">Biến Động Odds</span>
          </div>
        </button>

        <button
          onClick={() => setActiveModal('SMART_MONEY')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition cursor-pointer ${
            hasSmartMoney ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300' : 'bg-slate-800/90 border-slate-700 text-emerald-400 hover:bg-slate-700'
          }`}
        >
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-bold">Dòng Tiền & EV</span>
          </div>
        </button>
      </div>

      {/* POPUP MODAL CHUẨN BẢO MẬT IP MOAT */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b202c] border border-slate-600 rounded-2xl w-full max-w-sm p-5 text-white shadow-2xl relative">
            <button onClick={() => setActiveModal(null)} className="absolute top-3 right-3 text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>

            {activeModal === 'TRAP_ODDS' && (
              <div className="space-y-3">
                <h3 className="font-bold text-base text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" /> Kiểm Duyệt Bẫy Odds (Rule 5)
                </h3>
                <p className="text-xs text-slate-400">{homeName} vs {awayName}</p>

                <div className={`p-3.5 rounded-xl border ${isTrap ? 'bg-rose-950/90 border-rose-500 text-rose-200' : 'bg-slate-900 border-slate-700 text-emerald-300'}`}>
                  <p className="font-bold text-sm mb-1">{isTrap ? '⚠️ CẢNH BÁO BẪY ODDS NHÀ CÁI' : 'AN TOÀN: KHÔNG CÓ BẪY'}</p>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {isTrap 
                      ? 'Nhà cái có dấu hiệu đè giá bất thường — Khuyên không nên cược cửa Trên (Kích hoạt Rule 5 Quarantine).'
                      : 'Tỷ lệ biến động kèo tự nhiên theo khối lượng giao dịch thị trường.'}
                  </p>
                </div>
              </div>
            )}

            {activeModal === 'ODDS_MOVEMENT' && (
              <div className="space-y-3">
                <h3 className="font-bold text-base text-cyan-400 flex items-center gap-2">
                  <Activity className="h-5 w-5" /> So Sánh Biến Động Odds (T-3h vs T-24h)
                </h3>
                <p className="text-xs text-slate-400">{homeName} vs {awayName}</p>
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between"><span>Kèo Chấp Mở Cửa (T-24h):</span><span className="font-bold">{match.handicap_opening ?? 0}</span></div>
                  <div className="flex justify-between"><span>Kèo Chấp Hiện Tại (T-3h):</span><span className="font-bold text-cyan-400">{currentHcap}</span></div>
                  <div className="flex justify-between"><span>Tài Xỉu Mở Cửa (T-24h):</span><span className="font-bold">{match.overunder_opening ?? 2.5}</span></div>
                  <div className="flex justify-between"><span>Tài Xỉu Hiện Tại (T-3h):</span><span className="font-bold text-cyan-400">{currentOU}</span></div>
                </div>
              </div>
            )}

            {activeModal === 'SMART_MONEY' && (
              <div className="space-y-3">
                <h3 className="font-bold text-base text-emerald-400 flex items-center gap-2">
                  <Zap className="h-5 w-5" /> Dòng Tiền Smart Money & EV Edge
                </h3>
                <p className="text-xs text-slate-400">{homeName} vs {awayName}</p>
                <div className="bg-slate-900 border border-emerald-800/60 p-3.5 rounded-xl space-y-2 text-xs">
                  <p className="text-emerald-300 font-bold">{match.smart_money_signal || 'Dòng tiền tự nhiên giữa 2 cửa.'}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Lợi Thế Kỳ Vọng:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">+{edgeVal}% EV</span>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setActiveModal(null)} className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200">
              Đóng Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}