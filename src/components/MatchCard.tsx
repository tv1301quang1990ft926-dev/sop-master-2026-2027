import { Eye } from 'lucide-react';
import type { BaselineMatch } from '@/types';
import { formatKickoffDateTime } from '@/utils/dates';

interface MatchCardProps {
  match: BaselineMatch;
  isTracked: boolean;
  onToggleTrack: () => void;
  onOpenH2H: () => void;
}

function formatOdds(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : value.toFixed(2);
}

function formatLine(value: number | null | undefined, side?: 'home' | 'away'): string {
  if (value === null || value === undefined) return '--';
  const line = side === 'away' ? -value : value;
  return line > 0 ? `+${line.toFixed(2)}` : line.toFixed(2);
}

interface OddsCellProps {
  label: string;
  value: string;
}

function OddsCell({ label, value }: OddsCellProps) {
  return (
    <div className="flex min-h-20 flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/40 px-2 py-2 text-center">
      <span className="text-xs leading-tight text-slate-300">{label}</span>
      <strong className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</strong>
    </div>
  );
}

interface TeamProps {
  name: string;
  logo?: string | null;
}

function Team({ name, logo }: TeamProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 py-1 sm:gap-3">
      {logo ? <img src={logo} alt="" className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12" /> : null}
      <p className="truncate text-lg font-bold text-white sm:text-2xl">{name}</p>
    </div>
  );
}

export default function MatchCard({ match, isTracked, onToggleTrack, onOpenH2H }: MatchCardProps) {
  const payload = match.baseline_payload;
  const homeLogo = payload?.home_logo || match.home_logo;
  const awayLogo = payload?.away_logo || match.away_logo;

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-600 bg-[#1b202c] text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-xl">
      <header className="flex items-center justify-between gap-3 border-b border-slate-600 px-4 py-4 sm:px-5">
        <h3 className="min-w-0 truncate text-base font-bold uppercase tracking-wide text-white sm:text-lg">{match.league_name}</h3>
        <time className="shrink-0 text-sm font-semibold tabular-nums text-cyan-300 sm:text-base">{formatKickoffDateTime(match.match_date)}</time>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(74px,0.9fr))] gap-2 px-3 py-4 sm:grid-cols-[minmax(190px,1.2fr)_repeat(3,minmax(110px,0.8fr))] sm:gap-3 sm:px-5 sm:py-5">
        <div />
        <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận - 1X2<br />(Châu Âu)</p>
        <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận -<br />Cược Chấp</p>
        <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận -<br />Tài/Xỉu</p>

        <Team name={match.home_team} logo={homeLogo} />
        <OddsCell label="Đội nhà" value={formatOdds(payload?.odds_home_1x2)} />
        <OddsCell label={formatLine(payload?.handicap_opening, 'home')} value={formatOdds(payload?.odds_home_opening)} />
        <OddsCell label={`o ${formatLine(payload?.over_under_opening)}`} value={formatOdds(payload?.odds_over_opening)} />

        <Team name={match.away_team} logo={awayLogo} />
        <OddsCell label="Hòa" value={formatOdds(payload?.odds_draw_1x2)} />
        <OddsCell label={formatLine(payload?.handicap_opening, 'away')} value={formatOdds(payload?.odds_away_opening)} />
        <OddsCell label={`u ${formatLine(payload?.over_under_opening)}`} value={formatOdds(payload?.odds_under_opening)} />

        <button type="button" onClick={onOpenH2H} className="mt-1 min-h-20 rounded-xl border border-slate-600 bg-slate-900/40 px-3 text-base font-bold text-white transition-colors hover:bg-slate-800 sm:text-xl">
          <Eye className="mx-auto mb-1 h-5 w-5 sm:hidden" aria-hidden="true" />
          Xem H2H
        </button>
        <OddsCell label="Đội khách" value={formatOdds(payload?.odds_away_1x2)} />
        <button
          type="button"
          onClick={onToggleTrack}
          aria-pressed={isTracked}
          className={`col-span-2 mt-1 min-h-20 rounded-xl border px-3 text-base font-bold transition-colors sm:text-xl ${isTracked ? 'border-cyan-300 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25' : 'border-slate-600 bg-slate-900/40 text-white hover:bg-slate-800'}`}
        >
          {isTracked ? '⭐ Theo dõi' : '☆ Theo dõi'}
        </button>
      </div>
    </li>
  );
}
