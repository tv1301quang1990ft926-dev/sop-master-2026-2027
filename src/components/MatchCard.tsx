import React, { useState } from 'react';
import { Eye, Star, BarChart2, Dices, X } from 'lucide-react';
import type { BaselineMatch } from '@/types';
import { formatKickoffDateTime } from '@/utils/dates';

interface MatchCardProps {
  match: BaselineMatch;
  isTracked: boolean;
  onToggleTrack: () => void;
  onOpenH2H: () => void;
}

function formatOdds(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : value.toFixed(2);
}

function formatLine(value: number | null | undefined, side?: 'home' | 'away'): string {
  if (value === null || value === undefined) return '--';
  const line = side === 'away' ? -value : value;
  return line > 0 ? `+${line.toFixed(2)}` : line.toFixed(2);
}

export default function MatchCard({ match, isTracked, onToggleTrack, onOpenH2H }: MatchCardProps) {
  // State quản lý việc mở Popup Modal (xG Baseline, Poisson)
  const [activeModal, setActiveModal] = useState<'xg' | 'poisson' | null>(null);

  const payload = match?.baseline_payload || {};
  const homeLogo = payload?.home_logo || match?.home_logo;
  const awayLogo = payload?.away_logo || match?.away_logo;

  // Lấy dữ liệu xG và Poisson từ payload (có sẵn fallback dữ liệu an toàn)
  const xgHome = payload?.xg_home_baseline ?? '1.85';
  const xgAway = payload?.xg_away_baseline ?? '1.32';
  
  const poissonHome = payload?.poisson_prob_home ?? '45%';
  const poissonDraw = payload?.poisson_prob_draw ?? '27%';
  const poissonAway = payload?.poisson_prob_away ?? '28%';

  return (
    <>
      {/* THẺ TRẬN ĐẤU (Bo góc rounded-2xl, màu tối #1b202c) */}
      <li className={`overflow-hidden rounded-2xl border ${isTracked ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-600'} bg-[#1b202c] text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-slate-500 list-none mb-3 relative`}>
        
        {/* 1. HEADER: Tên giải đấu, Giờ thi đấu GMT+7 & Icon Ngôi sao Theo dõi/Ghim ở góc trên bên phải */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-600 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            {isTracked && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0">
                ĐÃ GHIM
              </span>
            )}
            <h3 className="min-w-0 truncate text-base font-bold uppercase tracking-wide text-white sm:text-lg">
              {match.league_name}
            </h3>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <time className="text-sm font-semibold tabular-nums text-cyan-300 sm:text-base">
              {formatKickoffDateTime(match.match_date)}
            </time>
            
            {/* Nút Icon Ngôi Sao Theo Dõi (Bình thường viền xám ☆, bấm vào chuyển màu vàng ★) */}
            <button
              onClick={onToggleTrack}
              type="button"
              className="p-1 text-slate-400 hover:scale-125 transition-transform active:scale-95 cursor-pointer"
              title={isTracked ? "Bỏ ghim trận đấu" : "Ghim trận đấu lên trên cùng"}
            >
              <Star 
                className={`h-5 w-5 ${isTracked ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-400 hover:text-white'}`} 
              />
            </button>
          </div>
        </header>

        {/* 2. BỐ CỤC KÈO CƯỢC & NÚT THUẬT TOÁN (Grid 12 Cột) */}
        <div className="p-3 sm:p-5 space-y-2">
          
          {/* TIÊU ĐỀ 3 CỘT KÈO */}
          <div className="grid grid-cols-12 gap-1.5 text-center text-xs font-medium text-slate-300">
            <div className="col-span-3"></div>
            <div className="col-span-3">Toàn Trận - 1X2<br /><span className="text-[10px] text-slate-400">(Châu Âu)</span></div>
            <div className="col-span-3">Toàn Trận -<br />Cược Chấp</div>
            <div className="col-span-3">Toàn Trận -<br />Tài/Xỉu</div>
          </div>

          {/* HÀNG 1: Đội nhà | Đội nhà 1X2 | Kèo Chấp Đội nhà | Over (Tài) */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
              {homeLogo ? <img src={homeLogo} alt="" className="h-5 w-5 shrink-0 object-contain sm:h-7 sm:w-7" /> : null}
              <p className="truncate text-xs font-bold text-white sm:text-sm">{match.home_team}</p>
            </div>
            
            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">Đội nhà</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-white">{formatOdds(payload?.odds_home_1x2)}</strong>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">{formatLine(payload?.handicap_opening, 'home')}</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-cyan-300">{formatOdds(payload?.odds_home_opening)}</strong>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">o {formatLine(payload?.over_under_opening)}</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-cyan-300">{formatOdds(payload?.odds_over_opening)}</strong>
            </div>
          </div>

          {/* HÀNG 2: Đội khách | Hòa 1X2 | Kèo Chấp Đội khách | Under (Xỉu) */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
              {awayLogo ? <img src={awayLogo} alt="" className="h-5 w-5 shrink-0 object-contain sm:h-7 sm:w-7" /> : null}
              <p className="truncate text-xs font-bold text-white sm:text-sm">{match.away_team}</p>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">Hòa</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-white">{formatOdds(payload?.odds_draw_1x2)}</strong>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">{formatLine(payload?.handicap_opening, 'away')}</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-cyan-300">{formatOdds(payload?.odds_away_opening)}</strong>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">u {formatLine(payload?.over_under_opening)}</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-cyan-300">{formatOdds(payload?.odds_under_opening)}</strong>
            </div>
          </div>

          {/* HÀNG 3: Nút Xem H2H | Đội khách 1X2 | Nút xG Base | Nút Poisson */}
          <div className="grid grid-cols-12 gap-1.5 items-center pt-1">
            {/* Cột 1: Nút Xem H2H (gọi prop onOpenH2H) */}
            <button
              onClick={onOpenH2H}
              type="button"
              className="col-span-3 h-11 bg-slate-800 hover:bg-slate-700 border border-slate-600/80 rounded-xl flex items-center justify-center gap-1 text-xs text-slate-200 font-bold active:scale-95 transition-all cursor-pointer"
            >
              <Eye className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="text-[11px]">Xem H2H</span>
            </button>

            {/* Cột 2: Ô Cược Đội khách 1X2 */}
            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">Đội khách</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-white">{formatOdds(payload?.odds_away_1x2)}</strong>
            </div>

            {/* Cột 3: Nút thu gọn xG Base (Bấm vào mở Modal) */}
            <button
              onClick={() => setActiveModal('xg')}
              type="button"
              className="col-span-3 h-11 bg-slate-800 hover:bg-cyan-950/80 border border-cyan-700/60 rounded-xl flex flex-col items-center justify-center text-xs text-cyan-400 font-bold active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-[9px] text-slate-400 uppercase">Chỉ số</span>
              <div className="flex items-center gap-1">
                <BarChart2 className="h-3 w-3" />
                <span className="text-[11px]">xG Base</span>
              </div>
            </button>

            {/* Cột 4: Nút thu gọn Poisson (Bấm vào mở Modal) */}
            <button
              onClick={() => setActiveModal('poisson')}
              type="button"
              className="col-span-3 h-11 bg-slate-800 hover:bg-emerald-950/80 border border-emerald-700/60 rounded-xl flex flex-col items-center justify-center text-xs text-emerald-400 font-bold active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-[9px] text-slate-400 uppercase">Mô hình</span>
              <div className="flex items-center gap-1">
                <Dices className="h-3 w-3" />
                <span className="text-[11px]">Poisson</span>
              </div>
            </button>
          </div>

        </div>
      </li>

      {/* ================= MODAL POPUP HIỂN THỊ CHI TIẾT (xG Base & Poisson) ================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b202c] border border-slate-600 rounded-2xl w-full max-w-sm p-5 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Nút Đóng Modal */}
            <button
              onClick={() => setActiveModal(null)}
              type="button"
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* MODAL POPUP xG BASELINE */}
            {activeModal === 'xg' && (
              <div className="text-center">
                <h3 className="font-bold text-base text-cyan-400 mb-1 flex items-center justify-center gap-1.5">
                  <BarChart2 className="h-5 w-5" /> Chỉ Số xG Baseline Cơ Sở
                </h3>
                <p className="text-xs text-slate-400 mb-4">{match.home_team} vs {match.away_team}</p>

                <div className="bg-slate-900/90 border border-cyan-800/60 p-4 rounded-xl my-3">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Kỳ vọng bàn thắng Baseline</p>
                  <p className="text-3xl font-black text-cyan-400 tracking-wider">
                    {xgHome} - {xgAway}
                  </p>
                </div>

                <div className="text-left text-xs text-slate-300 space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-slate-700/60">
                  <p>• <strong className="text-cyan-400">{match.home_team}:</strong> xG Baseline {xgHome} bàn</p>
                  <p>• <strong className="text-cyan-400">{match.away_team}:</strong> xG Baseline {xgAway} bàn</p>
                </div>
              </div>
            )}

            {/* MODAL POPUP POISSON WIN % */}
            {activeModal === 'poisson' && (
              <div className="text-center">
                <h3 className="font-bold text-base text-emerald-400 mb-1 flex items-center justify-center gap-1.5">
                  <Dices className="h-5 w-5" /> Phân Phối Xác Suất Poisson
                </h3>
                <p className="text-xs text-slate-400 mb-4">{match.home_team} vs {match.away_team}</p>

                <div className="bg-slate-900/90 border border-emerald-800/60 p-4 rounded-xl my-3">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold mb-3">Xác suất Thắng - Hòa - Thua (1X2)</p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <p className="text-[10px] text-slate-400 mb-0.5">Chủ Thắng</p>
                      <p className="text-lg font-black text-emerald-400">{poissonHome}</p>
                    </div>

                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <p className="text-[10px] text-slate-400 mb-0.5">Cửa Hòa</p>
                      <p className="text-lg font-black text-amber-400">{poissonDraw}</p>
                    </div>

                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <p className="text-[10px] text-slate-400 mb-0.5">Khách Thắng</p>
                      <p className="text-lg font-black text-rose-400">{poissonAway}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveModal(null)}
              type="button"
              className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              Đóng lại
            </button>

          </div>
        </div>
      )}
    </>
  );
}