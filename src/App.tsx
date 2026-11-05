import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import H2HModal from '@/components/H2HModal';
import MatchBoard from '@/components/MatchBoard';
import PhasePlaceholderView from '@/components/PhasePlaceholderView';
import { PHASES } from '@/constants/phases';
import { fetchTodayMatches } from '@/services/matches';
import type { BaselineMatch, LoadStatus, PhaseId } from '@/types';

function App() {
  const [activePhase, setActivePhase] = useState<PhaseId>('baseline');
  const [matches, setMatches] = useState<BaselineMatch[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [trackedIds, setTrackedIds] = useState<Set<string>>(() => new Set());
  const [h2hMatch, setH2hMatch] = useState<BaselineMatch | null>(null);

  const loadMatches = useCallback(async () => {
    setStatus('loading');
    try {
      setMatches(await fetchTodayMatches());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const orderedMatches = useMemo(
    () => [...matches].sort((a, b) => Number(trackedIds.has(b.match_id)) - Number(trackedIds.has(a.match_id))),
    [matches, trackedIds],
  );

  const toggleTrack = (matchId: string) => {
    setTrackedIds((current) => {
      const next = new Set(current);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-3 py-6 pb-28 sm:px-5">
        {activePhase === 'baseline' ? (
          <MatchBoard
            matches={orderedMatches}
            status={status}
            onRetry={loadMatches}
            trackedIds={trackedIds}
            onToggleTrack={toggleTrack}
            onOpenH2H={setH2hMatch}
          />
        ) : (
          <PhasePlaceholderView
            phase={PHASES[activePhase]}
            matches={orderedMatches}
            status={status}
            trackedIds={trackedIds}
            onToggleTrack={toggleTrack}
            onOpenH2H={setH2hMatch}
          />
        )}
      </main>
      <BottomNav activePhase={activePhase} onSelect={setActivePhase} />
      {h2hMatch && <H2HModal match={h2hMatch} onClose={() => setH2hMatch(null)} />}
    </div>
  );
}

export default App;
