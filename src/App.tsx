import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import H2HModal from '@/components/H2HModal';
import MatchBoard from '@/components/MatchBoard';
import PhasePlaceholderView from '@/components/PhasePlaceholderView';
import TrackingBoard from '@/components/TrackingBoard';
import { PHASES } from '@/constants/phases';
import { fetchTodayMatches } from '@/services/matches';
import type { BaselineMatch, LoadStatus, PhaseId } from '@/types';
import { getVietnamDateKey } from '@/utils/dates';

const TRACKED_STORAGE_KEY = 'sop_master_tracked_match_ids';

function App() {
  const [activePhase, setActivePhase] = useState<PhaseId>('baseline');
  const [matches, setMatches] = useState<BaselineMatch[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');

  // 1. Đọc danh sách trận theo dõi (trackedIds) từ localStorage
  const [trackedIds, setTrackedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(TRACKED_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [h2hMatch, setH2hMatch] = useState<BaselineMatch | null>(null);

  // 2. Đồng bộ trackedIds vào localStorage mỗi khi có thay đổi
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

  // 3. Nạp dữ liệu ban đầu + Tự động làm mới (Auto-polling 60 giây)
  useEffect(() => {
    loadMatches();
    const intervalId = setInterval(loadMatches, 60000);
    return () => clearInterval(intervalId);
  }, [loadMatches]);

  // 4. Sắp xếp & Lọc trận đấu chuẩn xác theo ngày Việt Nam
  const orderedMatches = useMemo(() => {
    if (matches.length === 0) return [];

    const todayDateKey = getVietnamDateKey(new Date().toISOString());

    // Lọc trận thuộc ngày hôm nay (fallback giữ nguyên mảng nếu không khớp)
    const todayMatches = matches.filter(
      (match) => getVietnamDateKey(match.match_date) === todayDateKey
    );
    const targetMatches = todayMatches.length > 0 ? todayMatches : matches;

    return [...targetMatches].sort((a, b) => {
      // Ưu tiên đưa các trận được đánh dấu theo dõi lên đầu
      const trackedOrder = Number(trackedIds.has(b.match_id)) - Number(trackedIds.has(a.match_id));
      if (trackedOrder !== 0) return trackedOrder;

      // Sắp xếp theo giờ thi đấu tăng dần
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

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-3 py-6 pb-28 sm:px-5">
        {/* TAB 2: BIẾN ĐỘNG ODDS GĐ2 (TRUYỀN TRỰC TIẾP DỮ LIỆU THỰC TẾ GĐ1 SAN) */}
        {activePhase === 'tracking' ? (
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

      {/* MODAL XEM H2H */}
      {h2hMatch && (
        <H2HModal match={h2hMatch} onClose={() => setH2hMatch(null)} />
      )}

      {/* THANH ĐIỀU HƯỚNG ĐÁY MÀN HÌNH */}
      <BottomNav activePhase={activePhase} onPhaseChange={setActivePhase} />
    </div>
  );
}

export default App;