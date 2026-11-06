import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, Search, Zap } from 'lucide-react';
import MatchCardStage2 from '@/components/MatchCardStage2';
import { fetchTrackingMovements } from '@/services/tracking';
import type { LoadStatus, TrackingMovement } from '@/types';

type SignalFilter = 'all' | 'trap' | 'smart' | 'edge';

const filters: Array<{ id: SignalFilter; label: string }> = [
  { id: 'all', label: 'Tất Cả Trận' },
  { id: 'trap', label: 'Cảnh Báo Bẫy Odds' },
  { id: 'smart', label: 'Dòng Tiền Thông Minh' },
  { id: 'edge', label: 'Lợi Thế Edge High (+EV ≥ 7%)' },
];

function matchesFilter(movement: TrackingMovement, filter: SignalFilter): boolean {
  if (filter === 'trap') return movement.trap_odds_warning;
  if (filter === 'smart') return Boolean(movement.smart_money_signal && movement.smart_money_signal !== 'Cân bằng');
  if (filter === 'edge') return (movement.expected_edge_t3h ?? 0) >= 7;
  return true;
}

export default function TrackingBoard() {
  const [movements, setMovements] = useState<TrackingMovement[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [activeFilter, setActiveFilter] = useState<SignalFilter>('all');
  const [search, setSearch] = useState('');

  const loadMovements = useCallback(async () => {
    setStatus('loading');
    try {
      setMovements(await fetchTrackingMovements());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesSearch = !query || `${movement.tran_dau} ${movement.giai_dau}`.toLowerCase().includes(query);
      return matchesSearch && matchesFilter(movement, activeFilter);
    });
  }, [activeFilter, movements, search]);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-700 bg-[#1b202c] p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" /></span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Live Tracking</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">GĐ2 — Tracking Movement <span className="text-cyan-300">(Mốc T-3h)</span></h1>
            <p className="mt-2 text-sm text-slate-300">Theo dõi chuyển động odds, bẫy nhà cái và tín hiệu dòng tiền thông minh.</p>
          </div>
          <button type="button" onClick={loadMovements} disabled={status === 'loading'} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 transition-colors hover:bg-cyan-400/20 disabled:cursor-wait disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            Làm Mới Live Odds
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên đội bóng hoặc giải đấu..." className="w-full rounded-xl border border-slate-600 bg-slate-900/60 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button key={filter.id} type="button" onClick={() => setActiveFilter(filter.id)} className={`whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${activeFilter === filter.id ? 'border-cyan-300 bg-cyan-400/15 text-cyan-200' : 'border-slate-600 bg-slate-900/40 text-slate-300 hover:bg-slate-800'}`}>
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {status === 'loading' ? (
        <div className="space-y-4" aria-live="polite"><div className="h-[520px] animate-pulse rounded-2xl bg-slate-300/70" /><div className="h-[520px] animate-pulse rounded-2xl bg-slate-300/70" /></div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"><AlertTriangle className="mx-auto h-7 w-7 text-rose-700" /><p className="mt-2 font-semibold text-rose-900">Chưa thể tải dữ liệu Tracking</p><button type="button" onClick={loadMovements} className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white">Thử Lại</button></div>
      ) : filteredMovements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Zap className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 font-semibold text-slate-700">Không có trận phù hợp với bộ lọc</p></div>
      ) : (
        <ul className="space-y-4">{filteredMovements.map((movement) => <MatchCardStage2 key={movement.match_id} movement={movement} />)}</ul>
      )}
    </section>
  );
}
