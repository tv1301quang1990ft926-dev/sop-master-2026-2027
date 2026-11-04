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

function formatNumber(value: number | null, digits = 2): string {
  return value === null ? '--' : value.toFixed(digits);
}

function formatSpread(value: number | null): string {
  if (value === null) return '--';
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function formatProbabilities(home: number | null, draw: number | null, away: number | null): string {
  if (home === null || draw === null || away === null) return '--';
  return `${home}% / ${draw}% / ${away}%`;
}

function formatXg(home: number | null, away: number | null): string {
  if (home === null || away === null) return '--';
  return `${home.toFixed(2)} vs ${away.toFixed(2)}`;
}

export default function MatchCard({ match, isTracked, onToggleTrack, onOpenH2H }: MatchCardProps) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
          {match.league_name}
        </span>
        <time className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
          {formatKickoffTime(match.kickoff_at)} GMT+7
        </time>
      </div>

      <p className="mt-3 text-center text-base font-semibold leading-snug text-slate-900">
        {match.home_team}
        <span className="mx-2 text-sm font-normal text-slate-400">vs</span>
        {match.away_team}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Spread" value={formatSpread(match.opening_spread)} />
        <Metric label="Total" value={formatNumber(match.opening_total, 2)} />
        <Metric
          label="Poisson H / D / A"
          value={formatProbabilities(match.poisson_home_win_pct, match.poisson_draw_pct, match.poisson_away_win_pct)}
        />
        <Metric label="Baseline xG H vs A" value={formatXg(match.baseline_xg_home, match.baseline_xg_away)} />
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
