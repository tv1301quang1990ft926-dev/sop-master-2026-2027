import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import H2HModal from '@/components/H2HModal';
import MatchCard from '@/components/MatchCard';
import { fetchTodayMatches } from '@/services/matches';
import type { BaselineMatch, LoadStatus } from '@/types';

export default function MatchBoard() {
  const [matches, setMatches] = useState<BaselineMatch[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [trackedIds, setTrackedIds] = useState<Set<string>>(() => new Set());
  const [h2hMatch, setH2hMatch] = useState<BaselineMatch | null>(null);

  const loadMatches = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await fetchTodayMatches();
      setMatches(data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const toggleTrack = (matchId: string) => {
    setTrackedIds((current) => {
      const next = new Set(current);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  const closeH2H = useCallback(() => setH2hMatch(null), []);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">GĐ1 - Kèo Hôm Nay</h2>
        <p className="text-sm text-slate-500">Trận đấu hôm nay theo giờ Việt Nam (GMT+7)</p>
      </div>

      {status === 'loading' && (
        <div className="space-y-3" aria-live="polite" aria-label="Loading matches">
          {[0, 1].map((item) => (
            <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-900">⚠️ Chưa thể tải dữ liệu trận đấu</p>
          <p className="text-xs text-red-800">Vui lòng bấm Thử Lại</p>
          <button
            type="button"
            onClick={loadMatches}
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Thử Lại
          </button>
        </div>
      )}

      {status === 'ready' && matches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-semibold text-slate-900">⚽ Chưa có trận đấu nào hôm nay</p>
          <p className="mt-1 text-sm text-slate-600">Hệ thống đang chờ cào dữ liệu</p>
        </div>
      )}

      {status === 'ready' && matches.length > 0 && (
        <ul className="space-y-3">
          {matches.map((match) => (
            <MatchCard
              key={match.match_id}
              match={match}
              isTracked={trackedIds.has(match.match_id)}
              onToggleTrack={() => toggleTrack(match.match_id)}
              onOpenH2H={() => setH2hMatch(match)}
            />
          ))}
        </ul>
      )}

      {h2hMatch && <H2HModal match={h2hMatch} onClose={closeH2H} />}
    </section>
  );
}
