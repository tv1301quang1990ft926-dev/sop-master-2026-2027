import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#151923]/95 backdrop-blur shadow-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* LOGO SOP MASTER */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
              SOP MASTER
            </span>
            <span className="text-[10px] font-medium text-slate-400">2026–2027 Season</span>
          </div>
        </div>

        {/* TIÊU ĐỀ GĐ1 IN NỔI BẬT TRÊN HEADER (NEON CYAN BADGE) */}
        <div className="flex items-center gap-2 rounded-xl bg-cyan-950 border-2 border-cyan-400 px-3.5 py-1.5 shadow-[0_0_16px_rgba(34,211,238,0.6)]">
          <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]"></span>
          <span className="text-xs font-black tracking-wider text-cyan-300 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]">
            GĐ1 - KÈO HÔM NAY
          </span>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;