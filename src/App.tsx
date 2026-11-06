import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import H2HModal from '@/components/H2HModal';
import MatchBoard from '@/components/MatchBoard';
import PhasePlaceholderView from '@/components/PhasePlaceholderView';
import TrackingBoard from '@/components/TrackingBoard';
import { fetchTodayMatches } from '@/services/matches';
import type { BaselineMatch, LoadStatus, PhaseId } from '@/types';
import { getVietnamDateKey } from '@/utils/dates';

const TRACKED_STORAGE_KEY = 'sop_master_tracked_match_ids';

export default function App() {
  const [activePhase, setActivePhase] = useState<PhaseId | string>('baseline');
  const [matches, setMatches] = useState<BaselineMatch[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');

  const [trackedIds, setTrackedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(TRACKED_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [h2hMatch, setH2hMatch] = useState<BaselineMatch | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TRACKED_STORAGE_KEY, JSON.stringify(Array.from(trackedIds)));
    } catch (e) {
      console.warn('Không thể lưu trạng thái theo dõi vào localStorage:', e);
    }
  }, [trackedIds]);

  const loadMatches = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await fetchTodayMatches();
      setMatches(data);
      setStatus('ready');
    } catch (err) {
      console.error('Lỗi nạp danh sách trận đấu:', err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadMatches();
    const intervalId = setInterval(loadMatches, 60000);
    return () => clearInterval(intervalId);
  }, [loadMatches]);

  const orderedMatches = useMemo(() => {
    if (matches.length === 0) return [];
    const todayDateKey = getVietnamDateKey(new Date().toISOString());
    const todayMatches = matches.filter(
      (match) => getVietnamDateKey(match.match_date) === todayDateKey
    );
    const targetMatches = todayMatches.length > 0 ? todayMatches : matches;

    return [...targetMatches].sort((a, b) => {
      const trackedOrder = Number(trackedIds.has(b.match_id)) - Number(trackedIds.has(a.match_id));
      if (trackedOrder !== 0) return trackedOrder;
      const timeA = new Date(a.match_date).getTime() || 0;
      const timeB = new Date(b.match_date).getTime() || 0;
      return timeA - timeB;
    });
  }, [matches, trackedIds]);

  const toggleTrack = (matchId: string) => {
    setTrackedIds((current) => {
      const next = new Set(current);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  // ĐIỀU KIỆN NHẬN BẤT KỲ ID NÀO CỦA GĐ2 ('tracking', 'movement', 'stage2', 'giai_doan_2')
  const isTrackingPhase = 
    activePhase === 'tracking' || 
    activePhase === 'movement' || 
    activePhase === 'stage2' || 
    activePhase === 'giai_doan_2';

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-3 py-6 pb-28 sm:px-5">
        {isTrackingPhase ? (
          <TrackingBoard 
            matches={orderedMatches} 
            onRefresh={loadMatches} 
          />
        ) : activePhase === 'baseline' ? (
          <MatchBoard
            matches={orderedMatches}
            status={status}
            onRetry={loadMatches}
            trackedIds={trackedIds}
            onToggleTrack={toggleTrack}
            onOpenH2H={setH2hMatch}
          />
        ) : (
          <PhasePlaceholderView phaseId={activePhase} />
        )}
      </main>

      {h2hMatch && (
        <H2HModal match={h2hMatch} onClose={() => setH2hMatch(null)} />
      )}

      <BottomNav activePhase={activePhase} onPhaseChange={setActivePhase} />
    </div>
  );
}