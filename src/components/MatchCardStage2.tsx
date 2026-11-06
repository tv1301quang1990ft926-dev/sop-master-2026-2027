import { useState } from 'react';
import { Activity, AlertTriangle, DollarSign, X } from 'lucide-react';
import type { TrackingMovement } from '@/types';
import { formatKickoffDateTime } from '@/utils/dates';

type AnalysisType = 'trap' | 'movement' | 'edge';

interface MatchCardStage2Props {
  movement: TrackingMovement;
}

function formatNumber(value: number | null, suffix = ''): string {
  return value === null ? '--' : `${value.toFixed(2)}${suffix}`;
}

function formatLine(value: number | null): string {
  if (value === null) return '--';
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function formatMovementTimestamp(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    hour12: false,
  }).format(new Date(value));
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

function Team({ name }: { name: string }) {
  return <p className="truncate py-1 text-lg font-bold text-white sm:text-2xl">{name}</p>;
}

function AnalysisModal({ type, movement, onClose }: { type: AnalysisType; movement: TrackingMovement; onClose: () => void }) {
  const title = type === 'trap' ? 'Kiểm Bẫy Odds' : type === 'movement' ? 'Biến Động Odds' : 'Dòng Tiền & EV Edge';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-slate-600 bg-[#202735] p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{movement.giai_dau}</p>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-slate-300">{movement.tran_dau}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {type === 'trap' && (
          <div className="mt-5 space-y-3">
            <div className={`rounded-xl border p-4 ${movement.trap_odds_warning ? 'border-rose-400/50 bg-rose-400/10' : 'border-emerald-400/50 bg-emerald-400/10'}`}>
              <p className="text-sm font-semibold">{movement.trap_odds_warning ? '⚠️ Bẫy Odds được phát hiện' : 'Không phát hiện bẫy Odds'}</p>
              <p className="mt-1 text-sm text-slate-300">{movement.trap_odds_warning ? 'Dấu hiệu đè giá ăn nhưng không tăng mức chấp. Gắn cờ Rule 5 / E-08.' : 'Biến động hiện tại chưa tạo tín hiệu bất thường theo Rule 5.'}</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">Khuyến nghị: đưa trận vào vùng <strong className="text-rose-300">Quarantine</strong>, không sử dụng để chốt kèo cho tới khi có dữ liệu xác nhận.</p>
          </div>
        )}

        {type === 'movement' && (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-600">
            <div className="grid grid-cols-3 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300"><span>Thị trường</span><span>Opening T-24h</span><span>Live T-3h</span></div>
            <div className="grid grid-cols-3 border-t border-slate-600 px-3 py-3 text-sm"><span>Cược chấp</span><strong>{formatLine(movement.handicap_opening)}</strong><strong className="text-cyan-300">{formatLine(movement.handicap_current_t3h)}</strong></div>
            <div className="grid grid-cols-3 border-t border-slate-600 px-3 py-3 text-sm"><span>Tài/Xỉu</span><strong>{formatNumber(movement.overunder_opening)}</strong><strong className="text-cyan-300">{formatNumber(movement.overunder_current_t3h)}</strong></div>
          </div>
        )}

        {type === 'edge' && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4"><p className="text-xs text-slate-300">Smart Money</p><p className="mt-1 text-xl font-bold text-emerald-300">{movement.smart_money_signal || 'Chưa xác định'}</p></div>
            <div className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 p-4"><p className="text-xs text-slate-300">Expected Edge</p><p className="mt-1 text-2xl font-bold text-cyan-300">{formatNumber(movement.expected_edge_t3h, '%')}</p></div>
          </div>
        )}

        <p className="mt-5 text-right text-xs text-slate-500">Cập nhật {formatMovementTimestamp(movement.update_timestamp_t3h)}</p>
      </div>
    </div>
  );
}

export default function MatchCardStage2({ movement }: MatchCardStage2Props) {
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [homeTeam, awayTeam] = movement.tran_dau.split(' - ').length === 2 ? movement.tran_dau.split(' - ') : [movement.tran_dau, ''];
  const matchDate = movement.update_timestamp_t3h;

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-600 bg-[#1b202c] text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-xl">
      <header className="flex items-center justify-between gap-3 border-b border-slate-600 px-4 py-4 sm:px-5">
        <h3 className="min-w-0 truncate text-base font-bold uppercase tracking-wide text-white sm:text-lg">{movement.giai_dau}</h3>
        <time className="shrink-0 text-sm font-semibold tabular-nums text-cyan-300 sm:text-base">{formatKickoffDateTime(matchDate)}</time>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(74px,0.9fr))] gap-2 px-3 py-4 sm:grid-cols-[minmax(190px,1.2fr)_repeat(3,minmax(110px,0.8fr))] sm:gap-3 sm:px-5 sm:py-5">
        <div />
        <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận - 1X2<br />(Châu Âu)</p>
        <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận -<br />Cược Chấp</p>
        <p className="text-center text-xs font-medium leading-tight text-slate-300 sm:text-sm">Toàn Trận -<br />Tài/Xỉu</p>
        <Team name={homeTeam} />
        <OddsCell label="Đội nhà" value={formatNumber(movement.odds_home_t3h)} />
        <OddsCell label={formatLine(movement.handicap_current_t3h)} value={formatNumber(movement.odds_home_t3h)} />
        <OddsCell label={`o ${formatNumber(movement.overunder_current_t3h)}`} value={formatNumber(movement.odds_home_t3h)} />
        <Team name={awayTeam} />
        <OddsCell label="Đội khách" value={formatNumber(movement.odds_away_t3h)} />
        <OddsCell label={formatLine(movement.handicap_current_t3h)} value={formatNumber(movement.odds_away_t3h)} />
        <OddsCell label={`u ${formatNumber(movement.overunder_current_t3h)}`} value={formatNumber(movement.odds_away_t3h)} />
      </div>
      <div className="grid grid-cols-1 gap-2 border-t border-slate-600 p-3 sm:grid-cols-3 sm:p-5">
        <button type="button" onClick={() => setAnalysisType('trap')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${movement.trap_odds_warning ? 'border-rose-400 bg-rose-400/15 text-rose-200 hover:bg-rose-400/25' : 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20'}`}>
          <AlertTriangle className="h-4 w-4" />
          {movement.trap_odds_warning ? '⚠️ Bẫy Odds!' : 'Kiểm Bẫy Odds'}
        </button>
        <button type="button" onClick={() => setAnalysisType('movement')} className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-3 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-400/20"><Activity className="h-4 w-4" />Biến Động Odds</button>
        <button type="button" onClick={() => setAnalysisType('edge')} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-400/10 px-3 py-3 text-sm font-bold text-emerald-200 hover:bg-emerald-400/20"><DollarSign className="h-4 w-4" />Dòng Tiền &amp; EV Edge</button>
      </div>
      {analysisType && <AnalysisModal type={analysisType} movement={movement} onClose={() => setAnalysisType(null)} />}
    </li>
  );
}
