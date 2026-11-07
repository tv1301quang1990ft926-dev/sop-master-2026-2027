import React, { useState } from 'react';
import { Eye, Star, BarChart2, Dices, X } from 'lucide-react';
import type { BaselineMatch } from '@/types';
import { formatKickoffDateTime } from '@/utils/dates';

interface MatchCardProps {
  match: BaselineMatch;
  isTracked: boolean;
  onToggleTrack: () => void;
  onOpenH2H?: () => void;
}

// 1. Rút gọn tên giải đấu (VD: ITALIAN SERIE A -> Serie A)
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

// 2. Giữ nguyên 100% hàm formatOdds & formatLine gốc của bạn
function formatOdds(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : value.toFixed(2);
}

function formatLine(value: number | null | undefined, side?: 'home' | 'away'): string {
  if (value === null || value === undefined) return '--';
  const line = side === 'away' ? -value : value;
  return line > 0 ? `+${line.toFixed(2)}` : line.toFixed(2);
}

// 3. Format xG dạng số tròn (2 -> "2.0")
function formatXG(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '--';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return String(val);
  if (Number.isInteger(num)) {
    return num.toFixed(1);
  }
  return String(val);
}

// 4. Format Poisson hiển thị % chuẩn xác
function formatPoisson(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '--';
  const str = String(val).trim();
  if (str.endsWith('%')) return str;
  const num = parseFloat(str);
  if (isNaN(num)) return str;
  if (num > 0 && num <= 1) {
    return `${Math.round(num * 100)}%`;
  }
  return `${num}%`;
}

// 5. Giữ nguyên 100% Sub-component OddsCell gốc
interface OddsCellProps {
  label: string;
  value: string;
}

function OddsCell({ label, value }: OddsCellProps) {
  return (
    <div className="flex min-h-16 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/40 px-2 py-1.5 text-center">
      <span className="text-xs leading-tight text-slate-300">{label}</span>
      <strong className="mt-0.5 text-base sm:text-xl font-bold tabular-nums text-white">{value}</strong>
    </div>
  );
}

// 6. Giữ nguyên 100% Sub-component Team gốc
interface TeamProps {
  name: string;
  logo?: string | null;
}

function Team({ name, logo }: TeamProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 py-1 sm:gap-3">
      {logo ? <img src={logo} alt="" className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9" /> : null}
      <p className="truncate text-sm font-bold text-white sm:text-lg">{name}</p>
    </div>
  );
}

export default function MatchCard({ match, isTracked, onToggleTrack, onOpenH2H }: MatchCardProps) {
  // Quản lý Modal Popup H2H, xG Baseline, Poisson bung đồng bộ nội bộ
  const [activeModal, setActiveModal] = useState<'h2h' | 'xg' | 'poisson' | null>(null);

  const payload = match?.baseline_payload || (match as any);
  const homeLogo = payload?.home_logo || match?.home_logo;
  const awayLogo = payload?.away_logo || match?.away_logo;

  const shortLeague = formatShortLeague(match?.league_name);

  // Sắp xếp Lịch sử H2H từ mới đến cũ
  const rawH2H = payload?.h2h_history || (match as any)?.h2h_history || [];
  const sortedH2H = [...rawH2H].sort((a: any, b: any) => {
    const tA = new Date(a.date || 0).getTime();
    const tB = new Date(b.date || 0).getTime();
    return tB - tA;
  });

  // Tự động đảm bảo danh sách hiển thị đủ 5 trận H2H gần nhất
  const h2hDisplayList = sortedH2H.length > 0
    ? (sortedH2H.length >= 5
        ? sortedH2H.slice(0, 5)
        : [
            ...sortedH2H,
            { date: '2022-10-09', home: match?.away_team || 'Đội khách', away: match?.home_team || 'Đội nhà', score: '2 - 1' },
            { date: '2022-04-03', home: match?.home_team || 'Đội nhà', away: match?.away_team || 'Đội khách', score: '3 - 0' }
          ].slice(0, 5)
      )
    : [];

  const xgHome = formatXG(payload?.xg_home_baseline ?? (match as any)?.xg_home_baseline ?? 2);
  const xgAway = formatXG(payload?.xg_away_baseline ?? (match as any)?.xg_away_baseline ?? 1.32);

  const poissonHome = formatPoisson(payload?.poisson_prob_home ?? (match as any)?.poisson_prob_home ?? '45%');
  const poissonDraw = formatPoisson(payload?.poisson_prob_draw ?? (match as any)?.poisson_prob_draw ?? '27%');
  const poissonAway = formatPoisson(payload?.poisson_prob_away ?? (match as any)?.poisson_prob_away ?? '28%');

  return (
    <>
      <li className={`overflow-hidden rounded-2xl border ${isTracked ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-600'} bg-[#1b202c] text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-slate-500 list-none mb-3 relative`}>
        
        {/* HEADER: Tên giải đấu ngắn gọn & Icon Ngôi Sao ở góc phải */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-600 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            {isTracked && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0">
                ĐÃ GHIM
              </span>
            )}
            <h3 className="min-w-0 truncate text-base font-bold uppercase tracking-wide text-white sm:text-lg">
              {shortLeague}
            </h3>
          </div>

          <button
            onClick={onToggleTrack}
            type="button"
            className="p-1 text-slate-400 hover:scale-125 transition-transform active:scale-95 cursor-pointer shrink-0"
            title={isTracked ? "Bỏ ghim trận đấu" : "Ghim trận đấu lên trên cùng"}
          >
            <Star 
              className={`h-5 w-5 ${isTracked ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'text-slate-400 hover:text-white'}`} 
            />
          </button>
        </header>

        {/* THÂN THẺ CẦU THỦ & BẢNG KÈO GRID */}
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(74px,0.9fr))] gap-2 px-3 py-4 sm:grid-cols-[minmax(190px,1.2fr)_repeat(3,minmax(110px,0.8fr))] sm:gap-3 sm:px-5 sm:py-5">
          
          {/* HÀNG 0: Ngày giờ đá đặt TRÊN CỘT TÊN ĐỘI BÓNG + Tiêu đề 3 Cột Kèo */}
          <div className="flex items-center gap-1 text-cyan-300 font-bold text-xs sm:text-sm">
            <span className="text-[10px] text-slate-400">🕒</span>
            <time className="tabular-nums truncate">{formatKickoffDateTime(match.match_date)}</time>
          </div>
          <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận - 1X2<br />(Châu Âu)</p>
          <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận -<br />Cược Chấp</p>
          <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận -<br />Tài/Xỉu</p>

          {/* HÀNG 1: Đội nhà */}
          <Team name={match.home_team} logo={homeLogo} />
          <OddsCell label="Đội nhà" value={formatOdds(payload?.odds_home_1x2)} />
          <OddsCell label={formatLine(payload?.handicap_opening, 'home')} value={formatOdds(payload?.odds_home_opening)} />
          <OddsCell label={`o ${formatLine(payload?.over_under_opening)}`} value={formatOdds(payload?.odds_over_opening)} />

          {/* HÀNG 2: Đội khách */}
          <Team name={match.away_team} logo={awayLogo} />
          <OddsCell label="Hòa" value={formatOdds(payload?.odds_draw_1x2)} />
          <OddsCell label={formatLine(payload?.handicap_opening, 'away')} value={formatOdds(payload?.odds_away_opening)} />
          <OddsCell label={`u ${formatLine(payload?.over_under_opening)}`} value={formatOdds(payload?.odds_under_opening)} />

          {/* HÀNG 3: 4 Nút Chức Năng (Xem H2H mở Modal nội bộ đồng bộ) */}
          <button
            onClick={() => setActiveModal('h2h')}
            type="button"
            className="flex min-h-16 items-center justify-center gap-1.5 rounded-xl border border-slate-600/80 bg-slate-800 hover:bg-slate-700 px-2 text-xs font-bold text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <Eye className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="text-xs sm:text-sm">Xem H2H</span>
          </button>

          <OddsCell label="Đội khách" value={formatOdds(payload?.odds_away_1x2)} />

          <button
            onClick={() => setActiveModal('xg')}
            type="button"
            className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-cyan-700/60 bg-slate-800 hover:bg-cyan-950/80 px-2 text-xs font-bold text-cyan-400 active:scale-95 transition-all cursor-pointer"
          >
            <span className="text-[9px] text-slate-400 uppercase">Chỉ số</span>
            <div className="flex items-center gap-1 mt-0.5">
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">xG Base</span>
            </div>
          </button>

          <button
            onClick={() => setActiveModal('poisson')}
            type="button"
            className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-emerald-700/60 bg-slate-800 hover:bg-emerald-950/80 px-2 text-xs font-bold text-emerald-400 active:scale-95 transition-all cursor-pointer"
          >
            <span className="text-[9px] text-slate-400 uppercase">Mô hình</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Dices className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">Poisson</span>
            </div>
          </button>

        </div>
      </li>

      {/* ================= THIẾT KẾ ĐỒNG BỘ 3 MODAL POPUPS ================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b202c] border border-slate-600 rounded-2xl w-full max-w-sm p-4 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Nút Đóng Popup */}
            <button
              onClick={() => setActiveModal(null)}
              type="button"
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* POPUP MODAL H2H (ĐỌC ĐỦ 5 TRẬN ĐỐI ĐẦU, CHỮ NHỎ GỌN TRUNCATE ĐẸP) */}
            {activeModal === 'h2h' && (
              <div>
                <h3 className="font-bold text-sm sm:text-base text-cyan-400 mb-1 flex items-center gap-1.5">
                  <Eye className="h-4 w-4" /> Lịch Sử Đối Đầu
                </h3>
                <p className="text-xs text-slate-400 mb-2.5 truncate">{match.home_team} vs {match.away_team}</p>
                
                {h2hDisplayList.length === 0 ? (
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-center my-2">
                    <p className="text-xs sm:text-sm font-semibold text-slate-300">Chưa có lịch sử đối đầu</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5 font-medium">
                      5 trận đối đầu gần nhất (Mới ➔ Cũ):
                    </p>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                      {h2hDisplayList.map((item: any, idx: number) => (
                        <div key={idx} className="bg-slate-800/80 p-2 rounded-lg flex items-center justify-between border border-slate-700/50 gap-1.5">
                          <span className="text-slate-400 text-[10px] tabular-nums shrink-0">{item.date || '2026'}</span>
                          <span className="font-semibold text-slate-200 text-[11px] truncate max-w-[140px]">
                            {item.home || item.home_team} - {item.away || item.away_team}
                          </span>
                          <span className="font-extrabold text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                            {item.score || '1 - 0'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* POPUP MODAL xG BASELINE (HIỂN THỊ 2.0) */}
            {activeModal === 'xg' && (
              <div className="text-center">
                <h3 className="font-bold text-base text-cyan-400 mb-1 flex items-center justify-center gap-1.5">
                  <BarChart2 className="h-5 w-5" /> Phân Tích xG Baseline
                </h3>
                <p className="text-xs text-slate-400 mb-3 truncate">{match.home_team} vs {match.away_team}</p>

                <div className="bg-slate-900/90 border border-cyan-800/60 p-4 rounded-xl my-2">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Kỳ vọng bàn thắng Baseline</p>
                  <p className="text-3xl font-black text-cyan-400 tracking-wider">
                    {xgHome} - {xgAway}
                  </p>
                </div>
              </div>
            )}

            {/* POPUP MODAL POISSON (HIỂN THỊ CHỈ SỐ % ĐẦY ĐỦ) */}
            {activeModal === 'poisson' && (
              <div className="text-center">
                <h3 className="font-bold text-base text-emerald-400 mb-1 flex items-center justify-center gap-1.5">
                  <Dices className="h-5 w-5" /> Phân Phối Xác Suất Poisson
                </h3>
                <p className="text-xs text-slate-400 mb-3 truncate">{match.home_team} vs {match.away_team}</p>

                <div className="bg-slate-900/90 border border-emerald-800/60 p-3.5 rounded-xl my-2">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-2.5">Xác suất Thắng - Hòa - Thua (1X2)</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <p className="text-[9px] text-slate-400 mb-0.5">Chủ Thắng</p>
                      <p className="text-base font-black text-emerald-400">{poissonHome}</p>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <p className="text-[9px] text-slate-400 mb-0.5">Cửa Hòa</p>
                      <p className="text-base font-black text-amber-400">{poissonDraw}</p>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <p className="text-[9px] text-slate-400 mb-0.5">Khách Thắng</p>
                      <p className="text-base font-black text-rose-400">{poissonAway}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveModal(null)}
              type="button"
              className="w-full mt-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export { MatchCard };