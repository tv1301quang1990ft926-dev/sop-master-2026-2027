import React from 'react';
import { X, Calendar, Trophy } from 'lucide-react';

export interface H2HRecord {
  date?: string;
  giai_dau?: string;
  league_name?: string;
  home_team?: string;
  away_team?: string;
  score?: string;
  winner?: string;
}

interface H2HModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: string;
  awayTeam: string;
  h2hHistory?: H2HRecord[];
}

export default function H2HModal({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  h2hHistory = [],
}: H2HModalProps) {
  if (!isOpen) return null;

  // Sắp xếp giảm dần theo mốc thời gian (mới nhất -> cũ nhất) và lấy đúng 5 trận
  const sortedH2H = [...h2hHistory]
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#1b202c] p-5 text-white shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-sm text-cyan-300">
              Lịch Sử Đối Đầu (H2H 5 Trận Gần Nhất)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center font-bold text-xs bg-slate-900 py-2 rounded-xl border border-slate-800 text-slate-200">
          {homeTeam} vs {awayTeam}
        </div>

        {sortedH2H.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            Chưa có dữ liệu đối đầu trực tiếp gần đây.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {sortedH2H.map((item, idx) => {
              const league = item.giai_dau || item.league_name || 'Top 8 Châu Âu';
              const dateStr = item.date || 'T-24h Baseline';
              const home = item.home_team || homeTeam;
              const away = item.away_team || awayTeam;
              const score = item.score || '0 - 0';

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-800/60 pb-1">
                    <span className="font-bold text-cyan-400 uppercase tracking-wide">
                      {league}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      {dateStr}
                    </span>
                  </div>

                  <div className="flex justify-between items-center font-bold">
                    <span className="truncate w-5/12 text-slate-200">{home}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                      {score}
                    </span>
                    <span className="truncate w-5/12 text-right text-slate-200">
                      {away}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 cursor-pointer transition"
        >
          Đóng Lại
        </button>
      </div>
    </div>
  );
}