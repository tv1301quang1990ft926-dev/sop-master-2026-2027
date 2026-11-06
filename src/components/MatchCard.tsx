import React, { useState } from 'react';
import { Eye, Star, BarChart2, Dices, X } from 'lucide-react';
import type { BaselineMatch } from '@/types';
import { formatKickoffDateTime } from '@/utils/dates';

interface MatchCardProps {
  match?: BaselineMatch | any;
  isTracked?: boolean;
  onToggleTrack?: () => void;
  onOpenH2H?: () => void;
}

// Hàm rút gọn tên giải đấu (VD: ITALIAN SERIE A -> Serie A)
function formatShortLeague(name?: string): string {
  if (!name) return 'BÓNG ĐÁ';
  return name
    .replace(/GERMAN\s+/i, '')
    .replace(/ENGLISH\s+/i, '')
    .replace(/SPANISH\s+/i, '')
    .replace(/ITALIAN\s+/i, '')
    .replace(/FRENCH\s+/i, '')
    .trim();
}

function formatOdds(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '--';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? String(value) : num.toFixed(2);
}

function formatLine(value: number | string | null | undefined, side?: 'home' | 'away'): string {
  if (value === null || value === undefined || value === '') return '--';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);
  const line = side === 'away' ? -num : num;
  return line > 0 ? `+${line.toFixed(2)}` : line.toFixed(2);
}

function safeKickoffTime(dateStr?: string): string {
  if (!dateStr) return '--/-- - --:--';
  try {
    return formatKickoffDateTime(dateStr);
  } catch {
    return String(dateStr);
  }
}

export function MatchCard({ match, isTracked = false, onToggleTrack, onOpenH2H }: MatchCardProps) {
  const [activeModal, setActiveModal] = useState<'h2h' | 'xg' | 'poisson' | null>(null);

  // Bảo vệ phòng thủ chống crash khi switch tab Chrome
  if (!match) return null;

  const payload = match.baseline_payload || match;
  const homeLogo = payload?.home_logo || match?.home_logo;
  const awayLogo = payload?.away_logo || match?.away_logo;

  const leagueShortName = formatShortLeague(match.league_name || payload.league_name);
  const kickoffTime = safeKickoffTime(match.match_date || payload.match_date || match.kickoff_time);

  // DỮ LIỆU THẬT: Lấy 5 trận H2H từ Supabase (nếu có)
  const h2hHistory = payload?.h2h_history || match?.h2h_history || [];

  // DỮ LIỆU THẬT: Chỉ số xG Baseline và Xác suất Poisson
  const xgHome = payload?.xg_home_baseline ?? match?.xg_home_baseline ?? '--';
  const xgAway = payload?.xg_away_baseline ?? match?.xg_away_baseline ?? '--';
  
  const poissonHome = payload?.poisson_prob_home ?? match?.poisson_prob_home ?? '--';
  const poissonDraw = payload?.poisson_prob_draw ?? match?.poisson_prob_draw ?? '--';
  const poissonAway = payload?.poisson_prob_away ?? match?.poisson_prob_away ?? '--';

  return (
    <>
      <li className={`overflow-hidden rounded-2xl border ${isTracked ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-600'} bg-[#1b202c] text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-slate-500 list-none mb-3 relative`}>
        
        {/* HEADER: Tên giải ngắn gọn & Icon Ngôi sao */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-600/80 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            {isTracked && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0">
                ĐÃ GHIM
              </span>
            )}
            <h3 className="min-w-0 truncate text-sm sm:text-base font-extrabold uppercase tracking-wide text-white">
              {leagueShortName}
            </h3>
          </div>

          <button
            onClick={() => onToggleTrack && onToggleTrack()}
            type="button"
            className="p-1 text-slate-400 hover:scale-125 transition-transform active:scale-95 cursor-pointer shrink-0"
            title={isTracked ? "Bỏ ghim" : "Ghim lên đầu"}
          >
            <Star 
              className={`h-5 w-5 ${isTracked ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'text-slate-400 hover:text-white'}`} 
            />
          </button>
        </header>

        {/* THÂN THẺ */}
        <div className="p-3 sm:p-5 space-y-2">
          
          {/* Mốc ngày giờ đá nằm ngay trên Tên đội bóng */}
          <div className="grid grid-cols-12 gap-1.5 items-center mb-1">
            <div className="col-span-3 flex items-center gap-1 text-cyan-300 font-bold text-xs sm:text-sm">
              <span className="text-[10px] text-slate-400">🕒</span>
              <time className="tabular-nums truncate">{kickoffTime}</time>
            </div>
            <div className="col-span-3 text-center text-xs font-medium text-slate-300">Toàn Trận - 1X2<br /><span className="text-[10px] text-slate-400">(Châu Âu)</span></div>
            <div className="col-span-3 text-center text-xs font-medium text-slate-300">Toàn Trận -<br />Cược Chấp</div>
            <div className="col-span-3 text-center text-xs font-medium text-slate-300">Toàn Trận -<br />Tài/Xỉu</div>
          </div>

          {/* HÀNG 1: Đội nhà */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
              {homeLogo ? <img src={homeLogo} alt="" className="h-4 w-4 shrink-0 object-contain sm:h-6 sm:w-6" /> : null}
              <p className="truncate text-xs font-bold text-white sm:text-sm">{match.home_team || payload?.home_team}</p>
            </div>
            
            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">Đội nhà</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-white">{formatOdds(payload?.odds_home_1x2)}</strong>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">{formatLine(payload?.handicap_opening, 'home')}</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-cyan-300">{formatOdds(payload?.odds_home_opening || payload?.odds_home_asia)}</strong>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">o {formatLine(payload?.over_under_opening)}</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-cyan-300">{formatOdds(payload?.odds_over_opening || payload?.odds_over)}</strong>
            </div>
          </div>

          {/* HÀNG 2: Đội khách */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
              {awayLogo ? <img src={awayLogo} alt="" className="h-4 w-4 shrink-0 object-contain sm:h-6 sm:w-6" /> : null}
              <p className="truncate text-xs font-bold text-white sm:text-sm">{match.away_team || payload?.away_team}</p>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">Hòa</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-white">{formatOdds(payload?.odds_draw_1x2)}</strong>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">{formatLine(payload?.handicap_opening, 'away')}</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-cyan-300">{formatOdds(payload?.odds_away_opening || payload?.odds_away_asia)}</strong>
            </div>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">u {formatLine(payload?.over_under_opening)}</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-cyan-300">{formatOdds(payload?.odds_under_opening || payload?.odds_under)}</strong>
            </div>
          </div>

          {/* HÀNG 3: Nút Xem H2H | Nút xG Base | Nút Poisson */}
          <div className="grid grid-cols-12 gap-1.5 items-center pt-1">
            <button
              onClick={() => {
                if (onOpenH2H) onOpenH2H();
                else setActiveModal('h2h');
              }}
              type="button"
              className="col-span-3 h-11 bg-slate-800 hover:bg-slate-700 border border-slate-600/80 rounded-xl flex items-center justify-center gap-1 text-xs text-slate-200 font-bold active:scale-95 transition-all cursor-pointer"
            >
              <Eye className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="text-[11px]">Xem H2H</span>
            </button>

            <div className="col-span-3 flex min-h-11 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-1.5 py-1 text-center">
              <span className="text-[10px] text-slate-400">Đội khách</span>
              <strong className="text-sm sm:text-base font-bold tabular-nums text-white">{formatOdds(payload?.odds_away_1x2)}</strong>
            </div>

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

      {/* MODAL POPUPS DỮ LIỆU THẬT */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b202c] border border-slate-600 rounded-2xl w-full max-w-sm p-5 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              type="button"
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* MODAL POPUP H2H ĐỌC DỮ LIỆU THẬT 5 TRẬN */}
            {activeModal === 'h2h' && (
              <div>
                <h3 className="font-bold text-base text-cyan-400 mb-1 flex items-center gap-1.5">
                  <Eye className="h-5 w-5" /> Lịch Sử Đối Đầu
                </h3>
                <p className="text-xs text-slate-400 mb-3">{match.home_team || payload?.home_team} vs {match.away_team || payload?.away_team}</p>
                
                {h2hHistory.length === 0 ? (
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-center my-3">
                    <p className="text-sm font-semibold text-slate-300">Chưa có lịch sử đối đầu</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-slate-400 mb-2 font-medium">
                      {h2hHistory.length >= 5 ? '5 trận đối đầu gần nhất:' : `Lịch sử đối đầu (${h2hHistory.length} trận gần nhất):`}
                    </p>
                    <div className="space-y-1.5 text-xs max-h-60 overflow-y-auto pr-1">
                      {h2hHistory.slice(0, 5).map((item: any, idx: number) => (
                        <div key={idx} className="bg-slate-800/80 p-2 rounded-lg flex justify-between items-center border border-slate-700/50">
                          <span className="text-slate-400 text-[11px]">{item.date}</span>
                          <span className="font-semibold text-slate-200">{item.home || item.home_team} - {item.away || item.away_team}</span>
                          <span className="font-extrabold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded">{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODAL POPUP xG BASELINE DỮ LIỆU THẬT */}
            {activeModal === 'xg' && (
              <div className="text-center">
                <h3 className="font-bold text-base text-cyan-400 mb-1 flex items-center justify-center gap-1.5">
                  <BarChart2 className="h-5 w-5" /> Chỉ Số xG Baseline Cơ Sở
                </h3>
                <p className="text-xs text-slate-400 mb-4">{match.home_team || payload?.home_team} vs {match.away_team || payload?.away_team}</p>

                <div className="bg-slate-900/90 border border-cyan-800/60 p-4 rounded-xl my-3">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Kỳ vọng bàn thắng Baseline</p>
                  <p className="text-3xl font-black text-cyan-400 tracking-wider">
                    {xgHome} - {xgAway}
                  </p>
                </div>
              </div>
            )}

            {/* MODAL POPUP POISSON DỮ LIỆU THẬT */}
            {activeModal === 'poisson' && (
              <div className="text-center">
                <h3 className="font-bold text-base text-emerald-400 mb-1 flex items-center justify-center gap-1.5">
                  <Dices className="h-5 w-5" /> Phân Phối Xác Suất Poisson
                </h3>
                <p className="text-xs text-slate-400 mb-4">{match.home_team || payload?.home_team} vs {match.away_team || payload?.away_team}</p>

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

export default MatchCard;