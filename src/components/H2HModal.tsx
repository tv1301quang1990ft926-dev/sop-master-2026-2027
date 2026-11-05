import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { BaselineMatch, H2HEntry } from '@/types';

interface H2HModalProps {
  match: BaselineMatch;
  onClose: () => void;
}

function getWinner(entry: H2HEntry): string {
  if (entry.winner) return entry.winner;
  if (entry.home_score > entry.away_score) return entry.home_team;
  if (entry.away_score > entry.home_score) return entry.away_team;
  return 'Hòa';
}

export default function H2HModal({ match, onClose }: H2HModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const history = match?.baseline_payload?.h2h_history || [];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="h2h-title"
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">{match.league_name}</p>
            <h2 id="h2h-title" className="mt-0.5 text-base font-semibold text-slate-900">
              H2H: {match.home_team} vs {match.away_team}
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
            Chưa có lịch sử đối đầu cho trận này.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {history.map((entry, index) => (
              <li key={`${entry.date}-${index}`} className="py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">{entry.date}</p>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {entry.home_score} - {entry.away_score}
                  </span>
                </div>
                <p className="mt-1 truncate font-medium text-slate-900">
                  {entry.home_team} vs {entry.away_team}
                </p>
                <p className="mt-1 text-xs text-teal-700">
                  Winner: <span className="font-semibold">{getWinner(entry)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
