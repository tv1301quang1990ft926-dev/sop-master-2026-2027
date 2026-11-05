import MatchCard from '@/components/MatchCard';
import type { PhaseTab } from '@/constants/phases';
import type { BaselineMatch, LoadStatus } from '@/types';

interface PhasePlaceholderViewProps {
  phase: PhaseTab;
  matches: BaselineMatch[];
  status: LoadStatus;
  trackedIds: Set<string>;
  onToggleTrack: (matchId: string) => void;
  onOpenH2H: (match: BaselineMatch) => void;
}

export default function PhasePlaceholderView({
  phase,
  matches,
  status,
  trackedIds,
  onToggleTrack,
  onOpenH2H,
}: PhasePlaceholderViewProps) {
  const Icon = phase.icon;

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <h2 className="text-xl font-bold text-slate-900">{phase.code} - {phase.name}</h2>
        </div>
        <p className="text-sm text-slate-500">Danh sách được ghim đồng bộ từ GĐ1</p>
      </div>

      {status === 'loading' && <div className="h-80 animate-pulse rounded-2xl bg-slate-300/70" />}
      {status === 'ready' && matches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600">
          Chưa có trận đấu để hiển thị.
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
