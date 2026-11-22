import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import H2HModal from '@/components/H2HModal';
import MatchBoard from '@/components/MatchBoard';
import PhasePlaceholderView from '@/components/PhasePlaceholderView';
import { PHASES } from '@/constants/phases';
import { fetchTodayMatches } from '@/services/matches';
import type { BaselineMatch, LoadStatus, PhaseId } from '@/types';
import { getVietnamDateKey } from '@/utils/dates';

function App() {
  const [activePhase, setActivePhase] = useState<PhaseId>('baseline');
  const [matches, setMatches] = useState<BaselineMatch[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [trackedIds, setTrackedIds] = useState<Set<string>>(() => new Set());
  const [h2hMatch, setH2hMatch] = useState<BaselineMatch | null>(null);

  const loadMatches = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await fetchTodayMatches();
      setMatches(data || []);
      setStatus('ready');
    } catch (err) {
      console.error('Lỗi nạp danh sách trận đấu:', err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Sắp xếp danh sách trận đấu chuẩn Rule 4 (T-24h Baseline: Sớm -> Trễ GMT+7)
  const orderedMatches = useMemo(() => {
    if (!matches || !Array.isArray(matches) || matches.length === 0) return [];

    // Lấy ngày thi đấu mới nhất
    const lastMatch = matches[matches.length - 1];
    const latestDate = lastMatch?.match_date ? getVietnamDateKey(lastMatch.match_date) : null;

    const filtered = latestDate
      ? matches.filter((match) => getVietnamDateKey(match.match_date) === latestDate)
      : matches;

    return [...filtered].sort((a, b) => {
      // 1. Ưu tiên trận được bấm ghim theo dõi
      const isTrackedA = trackedIds.has(a.match_id) ? 1 : 0;
      const isTrackedB = trackedIds.has(b.match_id) ? 1 : 0;
      if (isTrackedB !== isTrackedA) return isTrackedB - isTrackedA;

      // 2. Sắp xếp giờ bóng lăn từ Sớm -> Trễ theo giờ GMT+7
      const timeA = a?.match_date ? new Date(a.match_date).getTime() : 0;
      const timeB = b?.match_date ? new Date(b.match_date).getTime() : 0;
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

  return (
    <div className="min-h-screen bg-[#1b202c] font-sans text-slate-100">
      {/* Thanh Header chính */}
      <AppHeader />

      {/* Nội dung chính của ứng dụng */}
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
            phase={PHASES[activePhase] ?? PHASES.baseline}
            matches={orderedMatches}
            status={status}
            trackedIds={trackedIds}
            onToggleTrack={toggleTrack}
            onOpenH2H={setH2hMatch}
          />
        )}
      </main>

      {/* Thanh điều hướng Giai đoạn dưới đáy màn hình */}
      <BottomNav
        activePhase={activePhase}
        onSelect={(phaseId) => setActivePhase(phaseId)}
      />

      {/* Popup Modal hiển thị 5 trận H2H gần nhất kèm Giải đấu */}
      {h2hMatch && (
        <H2HModal
          isOpen={!!h2hMatch}
          onClose={() => setH2hMatch(null)}
          homeTeam={h2hMatch.home_team}
          awayTeam={h2hMatch.away_team}
          h2hHistory={(h2hMatch.baseline_payload?.h2h_history ?? []).map((h) => ({
            ...h,
            score: h.score ?? undefined,
            home_score: h.home_score ?? undefined,
            away_score: h.away_score ?? undefined,
            winner: h.winner ?? undefined,
          }))}
        />
      )}
    </div>
  );
}

export default App;