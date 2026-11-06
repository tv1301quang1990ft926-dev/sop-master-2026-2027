import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { BaselineMatch, H2HEntry } from '@/types';
import { formatHistoryDate } from '@/utils/dates';

interface H2HModalProps {
  match: BaselineMatch;
  onClose: () => void;
}

// Trích xuất danh sách H2H phòng thủ (xử lý cả JSON String, Object payload lẫn Mảng trực tiếp)
function parseH2HHistory(match: any): H2HEntry[] {
  if (!match) return [];
  
  // 1. Trường hợp h2h_history là mảng sẵn
  if (Array.isArray(match.h2h_history)) {
    return match.h2h_history;
  }
  
  // 2. Trường hợp h2h_history là chuỗi JSON trong Supabase
  if (typeof match.h2h_history === 'string') {
    try {
      const parsed = JSON.parse(match.h2h_history);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // bỏ qua lỗi parse
    }
  }

  // 3. Trường hợp nằm trong baseline_payload (Object hoặc JSON string)
  if (match.baseline_payload) {
    let payload = match.baseline_payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = null;
      }
    }
    if (payload?.h2h_history && Array.isArray(payload.h2h_history)) {
      return payload.h2h_history;
    }
  }

  return [];
}

function getWinner(entry: H2HEntry): string | null {
  if (entry.winner) return entry.winner;
  
  const hScore = entry.home_score !== null && entry.home_score !== undefined ? Number(entry.home_score) : null;
  const aScore = entry.away_score !== null && entry.away_score !== undefined ? Number(entry.away_score) : null;

  if (hScore === null || aScore === null || Number.isNaN(hScore) || Number.isNaN(aScore)) {
    return null;
  }

  if (hScore > aScore) return entry.home_team || 'Đội nhà';
  if (aScore > hScore) return entry.away_team || 'Đội khách';
  return 'Hòa';
}

function getScore(entry: H2HEntry): string {
  if (entry.score) return entry.score;
  
  const hScore = entry.home_score !== null && entry.home_score !== undefined ? Number(entry.home_score) : null;
  const aScore = entry.away_score !== null && entry.away_score !== undefined ? Number(entry.away_score) : null;

  if (hScore !== null && aScore !== null && !Number.isNaN(hScore) && !Number.isNaN(aScore)) {
    return `${hScore} - ${aScore}`;
  }

  // KHÔNG hardcode '1 - 1' để tránh hiển thị tỷ số giả định!
  return 'Chưa có tỷ số';
}

export default function H2HModal({ match, onClose }: H2HModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Trích xuất an toàn 5 trận H2H gần nhất
  const history = useMemo(() => {
    return parseH2HHistory(match).slice(0, 5);
  }, [match]);

  return (
    <div 
      className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" 
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="h2h-title"
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {(match as any).league_name || (match as any).giai_dau || 'Giải đấu'}
            </p>
            <h2 id="h2h-title" className="mt-0.5 text-base font-semibold text-slate-900">
              H2H: {(match as any).home_team} vs {(match as any).away_team}
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            aria-label="Đóng" 
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {history.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
            Chưa có dữ liệu đối đầu H2H thực tế
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {history.map((entry, index) => {
              const winner = getWinner(entry);
              const scoreStr = getScore(entry);
              const dateVal = entry.date || (entry as any).match_date;
              const dateStr = dateVal ? formatHistoryDate(dateVal) : 'N/A';

              return (
                <li key={`${dateVal || index}-${index}`} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <time>{dateStr}</time>
                    {winner ? (
                      <span>
                        Thắng: <strong className="text-teal-700">{winner}</strong>
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-medium text-slate-900">
                    {entry.home_team} <span className="mx-1 font-bold text-slate-700">{scoreStr}</span> {entry.away_team}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}