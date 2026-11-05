import { RefreshCw } from 'lucide-react';
import MatchCard from '@/components/MatchCard';
import type { BaselineMatch, LoadStatus } from '@/types';

interface MatchBoardProps {
  matches: BaselineMatch[];
  status: LoadStatus;
  onRetry: () => void;
  trackedIds: Set<string>;
  onToggleTrack: (matchId: string) => void;
  onOpenH2H: (match: BaselineMatch) => void;
}

export default function MatchBoard({
  matches,
  status,
  onRetry,
  trackedIds,
  onToggleTrack,
  onOpenH2H,
}: MatchBoardProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">GĐ1 - Kèo Hôm Nay</h2>
        <p className="text-sm text-slate-500">Trận đấu hôm nay theo giờ Việt Nam (GMT+7)</p>
      </div>

      {status === 'loading' && (
        <div className="space-y-3" aria-live="polite" aria-label="Loading matches">
          {[0, 1].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-300/70" />)}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-900">Chưa thể tải dữ liệu trận đấu</p>
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Thử Lại
          </button>
        </div>
      )}

      {status === 'ready' && matches.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-semibold text-slate-900">Chưa có trận đấu cho ngày hôm nay</p>
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Làm Mới
          </button>
        </div>
      )}

      {status === 'ready' && matches.length > 0 && (
        <ul className="space-y-4">
          {matches.map((match) => (
            <MatchCard
              key={match.match_id}
              match={match}
              isTracked={trackedIds.has(match.match_id)}
              onToggleTrack={() => onToggleTrack(match.match_id)}
              onOpenH2H={() => onOpenH2H(match)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
