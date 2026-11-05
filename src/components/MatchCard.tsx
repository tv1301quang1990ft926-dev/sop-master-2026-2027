import { Eye } from 'lucide-react';
import type { BaselineMatch } from '@/types';
import { formatKickoffTime } from '@/utils/dates';

interface MatchCardProps {
  match: BaselineMatch;
  isTracked: boolean;
  onToggleTrack: () => void;
  onOpenH2H: () => void;
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2">
      <dt className="text-[11px] font-medium leading-tight text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function formatHandicap(value: number | null): string {
  if (value === null) return '--';
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function formatOdds(value: number | null): string {
  return value === null ? '--' : value.toFixed(2);
}

function formatXg(home: number | null, away: number | null): string {
  if (home === null || away === null) return '--';
  return `${home.toFixed(2)} vs ${away.toFixed(2)}`;
}

export default function MatchCard({ match, isTracked, onToggleTrack, onOpenH2H }: MatchCardProps) {
  const payload = match.baseline_payload;

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
          {match.league_name}
        </span>
        <time className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
          {formatKickoffTime(match.match_date)} GMT+7
        </time>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Đội nhà</p>
          <p className="truncate text-base font-semibold text-slate-900">{match.home_team}</p>
        </div>
        <span className="text-sm text-slate-400">vs</span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Đội khách</p>
          <p className="truncate text-base font-semibold text-slate-900">{match.away_team}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Handicap mở" value={formatHandicap(payload?.handicap_opening ?? null)} />
        <Metric label="Odds nhà mở" value={formatOdds(payload?.odds_home_opening ?? null)} />
        <Metric label="Odds khách mở" value={formatOdds(payload?.odds_away_opening ?? null)} />
        <Metric
          label="xG nhà vs khách"
          value={formatXg(payload?.xg_home_baseline ?? null, payload?.xg_away_baseline ?? null)}
        />
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onOpenH2H}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          Xem H2H
        </button>
        <button
          type="button"
          onClick={onToggleTrack}
          aria-pressed={isTracked}
          className={`inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            isTracked
              ? 'bg-teal-700 text-white hover:bg-teal-800'
              : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
          }`}
        >
          Mức Theo Dõi 🖤
        </button>
      </div>
    </li>
  );
}
