import React, { useState } from 'react';

export interface MatchData {
  match_id: string;
  league_name: string;
  kickoff_time: string;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  odds_home_1x2?: string;
  odds_draw_1x2?: string;
  odds_away_1x2?: string;
  handicap_opening?: string;
  odds_home_asia?: string;
  odds_away_asia?: string;
  over_under_opening?: string;
  odds_over?: string;
  odds_under?: string;
  xg_home_baseline?: string;
  xg_away_baseline?: string;
  poisson_prob_home?: string;
  poisson_prob_draw?: string;
  poisson_prob_away?: string;
  h2h_history?: Array<{
    date: string;
    home: string;
    away: string;
    score: string;
  }>;
}

interface MatchCardProps {
  match: MatchData;
  isPinned?: boolean;
  onTogglePin?: (matchId: string) => void;
}

export function MatchCard({ match, isPinned = false, onTogglePin }: MatchCardProps) {
  // State quản lý việc mở 3 Popup Modal (H2H, xG Baseline, Poisson)
  const [activeModal, setActiveModal] = useState<'h2h' | 'xg' | 'poisson' | null>(null);

  const matchId = match?.match_id || '1';
  const h2hList = match?.h2h_history || [];

  return (
    <>
      {/* KHUNG THẺ TRẬN ĐẤU (Giữ 100% Giao diện chuẩn #0D1527) */}
      <div className={`w-full bg-[#0D1527] border ${isPinned ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-800/80'} rounded-2xl p-3 text-white shadow-xl mb-3 font-sans relative transition-all duration-300`}>
        
        {/* 1. Header Giải đấu, Giờ GMT+7 & Icon Ngôi sao Theo dõi/Ghim ở góc trên bên phải */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-800/60 mb-2.5">
          <div className="flex items-center gap-1.5 overflow-hidden pr-2">
            {isPinned && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/40">
                ĐÃ GHIM
              </span>
            )}
            <span className="font-bold text-xs uppercase tracking-wider text-slate-100 truncate">
              {match?.league_name || 'GERMAN BUNDESLIGA'}
            </span>
          </div>
          
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-xs font-semibold text-cyan-400">
              {match?.kickoff_time || '07/11 - 02:30'}
            </span>
            
            {/* Nút Ngôi sao Theo dõi: Không màu (☆), Bấm vào thành màu vàng (★) & đẩy lên trên cùng */}
            <button 
              onClick={() => onTogglePin && onTogglePin(matchId)}
              className="p-1 hover:scale-125 transition-transform active:scale-95"
              title={isPinned ? "Bỏ ghim trận đấu" : "Ghim trận đấu lên trên cùng"}
            >
              {isPinned ? (
                <span className="text-amber-400 text-lg drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">★</span>
              ) : (
                <span className="text-slate-500 hover:text-slate-300 text-lg">☆</span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Tiêu đề 3 Cột Kèo Cược */}
        <div className="grid grid-cols-12 gap-1.5 text-[10px] text-slate-400 font-medium mb-1.5 text-center">
          <div className="col-span-3"></div>
          <div className="col-span-3">Toàn Trận - 1X2 (Châu Âu)</div>
          <div className="col-span-3">Toàn Trận - Cược Chấp</div>
          <div className="col-span-3">Toàn Trận - Tài/Xỉu</div>
        </div>

        {/* 3. Ma Trận Ô Cược & 4 Nút Chức Năng */}
        <div className="space-y-1.5">
          
          {/* HÀNG 1: Đội nhà | Nút Đội nhà (1X2) | Kèo Chấp Đội nhà | Over (Tài) */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
              <img src={match?.home_logo || '[suspicious link removed]'} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
              <span className="text-xs font-semibold truncate text-slate-100">{match?.home_team || 'Bayern Munich'}</span>
            </div>
            <button className="col-span-3 h-10 px-2 bg-[#1A2338] hover:bg-slate-700 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-xs transition-colors">
              <span className="text-slate-400 text-[10px]">Đội nhà</span>
              <span className="font-bold text-white">{match?.odds_home_1x2 || '1.85'}</span>
            </button>
            <button className="col-span-3 h-10 px-2 bg-[#1A2338] hover:bg-slate-700 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-xs transition-colors">
              <span className="text-slate-400 text-[10px]">{match?.handicap_opening || '-1.5'}</span>
              <span className="font-bold text-cyan-400">{match?.odds_home_asia || '2.05'}</span>
            </button>
            <button className="col-span-3 h-10 px-2 bg-[#1A2338] hover:bg-slate-700 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-xs transition-colors">
              <span className="text-slate-400 text-[10px]">o {match?.over_under_opening || '3.5'}</span>
              <span className="font-bold text-cyan-400">{match?.odds_over || '1.90'}</span>
            </button>
          </div>

          {/* HÀNG 2: Đội khách | Nút Hòa (1X2) | Kèo Chấp Đội khách | Under (Xỉu) */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
              <img src={match?.away_logo || '[suspicious link removed]'} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
              <span className="text-xs font-semibold truncate text-slate-100">{match?.away_team || 'Dortmund'}</span>
            </div>
            <button className="col-span-3 h-10 px-2 bg-[#1A2338] hover:bg-slate-700 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-xs transition-colors">
              <span className="text-slate-400 text-[10px]">Hòa</span>
              <span className="font-bold text-white">{match?.odds_draw_1x2 || '3.70'}</span>
            </button>
            <button className="col-span-3 h-10 px-2 bg-[#1A2338] hover:bg-slate-700 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-xs transition-colors">
              <span className="text-slate-400 text-[10px]">+{Math.abs(Number(match?.handicap_opening) || 1.5)}</span>
              <span className="font-bold text-cyan-400">{match?.odds_away_asia || '1.80'}</span>
            </button>
            <button className="col-span-3 h-10 px-2 bg-[#1A2338] hover:bg-slate-700 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-xs transition-colors">
              <span className="text-slate-400 text-[10px]">u {match?.over_under_opening || '3.5'}</span>
              <span className="font-bold text-cyan-400">{match?.odds_under || '1.95'}</span>
            </button>
          </div>

          {/* HÀNG 3: Nút Xem H2H | Đội khách 1X2 | Nút xG Base | Nút Poisson */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            {/* Nút 1: Xem H2H */}
            <button 
              onClick={() => setActiveModal('h2h')}
              className="col-span-3 h-10 bg-[#1A2338] hover:bg-slate-700 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-xs text-slate-300 font-medium active:scale-95 transition-all"
            >
              <span className="text-xs">👁</span>
              <span className="text-[11px] font-bold">Xem H2H</span>
            </button>

            {/* Nút 2: Cửa cược Đội khách 1X2 */}
            <button className="col-span-3 h-10 px-2 bg-[#1A2338] hover:bg-slate-700 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-xs transition-colors">
              <span className="text-slate-400 text-[10px]">Đội khách</span>
              <span className="font-bold text-white">{match?.odds_away_1x2 || '3.90'}</span>
            </button>

            {/* Nút 3: Nút bấm mở Popup xG Base */}
            <button 
              onClick={() => setActiveModal('xg')}
              className="col-span-3 h-10 bg-[#1A2338] hover:bg-cyan-950/80 border border-cyan-800/60 rounded-xl flex flex-col items-center justify-center text-xs text-cyan-400 font-bold active:scale-95 transition-all"
            >
              <span className="text-[9px] text-slate-400 uppercase">Chỉ số</span>
              <span className="text-[11px]">📊 xG Base</span>
            </button>

            {/* Nút 4: Nút bấm mở Popup Poisson */}
            <button 
              onClick={() => setActiveModal('poisson')}
              className="col-span-3 h-10 bg-[#1A2338] hover:bg-emerald-950/80 border border-emerald-800/60 rounded-xl flex flex-col items-center justify-center text-xs text-emerald-400 font-bold active:scale-95 transition-all"
            >
              <span className="text-[9px] text-slate-400 uppercase">Mô hình</span>
              <span className="text-[11px]">🎲 Poisson</span>
            </button>
          </div>

        </div>
      </div>

      {/* ================= MODAL POPUP THÔNG TIN CHI TIẾT KHI BẤM ================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-2xl w-full max-w-sm p-4 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Nút Đóng Popup */}
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-base font-bold w-7 h-7 flex items-center justify-center bg-slate-800 rounded-full"
            >
              ✕
            </button>

            {/* POPUP 1: LỊCH SỬ ĐỐI ĐẦU H2H */}
            {activeModal === 'h2h' && (
              <div>
                <h3 className="font-bold text-sm text-cyan-400 mb-1 flex items-center gap-1.5">
                  <span>👁</span> Lịch Sử Đối Đầu
                </h3>
                <p className="text-xs text-slate-400 mb-3">{match?.home_team} vs {match?.away_team}</p>
                
                {h2hList.length === 0 ? (
                  /* Hiển thị chuẩn câu chữ: "Chưa có lịch sử đối đầu" */
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-center my-3">
                    <p className="text-sm font-semibold text-slate-300">Chưa có lịch sử đối đầu</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-slate-400 mb-2 font-medium">
                      {h2hList.length >= 5 
                        ? '5 trận đối đầu gần nhất:' 
                        : `Lịch sử đối đầu (${h2hList.length} trận gần nhất):`}
                    </p>
                    <div className="space-y-1.5 text-xs max-h-60 overflow-y-auto pr-1">
                      {h2hList.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="bg-slate-800/80 p-2 rounded-lg flex justify-between items-center border border-slate-700/50">
                          <span className="text-slate-400 text-[11px]">{item.date}</span>
                          <span className="font-semibold text-slate-200">{item.home} - {item.away}</span>
                          <span className="font-extrabold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded">{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* POPUP 2: CHI TIẾT xG BASELINE */}
            {activeModal === 'xg' && (
              <div className="text-center">
                <h3 className="font-bold text-sm text-cyan-400 mb-1 flex items-center justify-center gap-1.5">
                  <span>📊</span> Chỉ Số xG Baseline Cơ Sở
                </h3>
                <p className="text-xs text-slate-400 mb-3">{match?.home_team} vs {match?.away_team}</p>
                
                <div className="bg-slate-900/90 border border-cyan-800/60 p-4 rounded-xl my-2">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Kỳ vọng bàn thắng Baseline</p>
                  <p className="text-2xl font-black text-cyan-400 tracking-wider">
                    {match?.xg_home_baseline || '1.85'} - {match?.xg_away_baseline || '1.32'}
                  </p>
                </div>
                <div className="text-left text-[11px] text-slate-300 space-y-1 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <p>• <strong className="text-cyan-400">{match?.home_team}:</strong> xG Kỳ vọng {match?.xg_home_baseline || '1.85'} bàn</p>
                  <p>• <strong className="text-cyan-400">{match?.away_team}:</strong> xG Kỳ vọng {match?.xg_away_baseline || '1.32'} bàn</p>
                </div>
              </div>
            )}

            {/* POPUP 3: CHI TIẾT POISSON WIN % */}
            {activeModal === 'poisson' && (
              <div className="text-center">
                <h3 className="font-bold text-sm text-emerald-400 mb-1 flex items-center justify-center gap-1.5">
                  <span>🎲</span> Phân Phối Xác Suất Poisson
                </h3>
                <p className="text-xs text-slate-400 mb-3">{match?.home_team} vs {match?.away_team}</p>
                
                <div className="bg-slate-900/90 border border-emerald-800/60 p-3 rounded-xl my-2">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold mb-2">Xác suất Thắng - Hòa - Thua (1X2)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <p className="text-[10px] text-slate-400">Chủ Thắng</p>
                      <p className="text-base font-extrabold text-emerald-400">{match?.poisson_prob_home || '45%'}</p>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <p className="text-[10px] text-slate-400">Cửa Hòa</p>
                      <p className="text-base font-extrabold text-amber-400">{match?.poisson_prob_draw || '27%'}</p>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <p className="text-[10px] text-slate-400">Khách Thắng</p>
                      <p className="text-base font-extrabold text-rose-400">{match?.poisson_prob_away || '28%'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={() => setActiveModal(null)}
              className="w-full mt-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-colors"
            >
              Đóng lại
            </button>

          </div>
        </div>
      )}
    </>
  );
}