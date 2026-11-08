import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#151923]/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* LOGO SOP MASTER */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              SOP MASTER
            </span>
            <span className="text-[10px] font-medium text-slate-400">2026–2027 Season</span>
          </div>
        </div>

        {/* THẺ GĐ1 - KÈO HÔM NAY IN NỔI RÕ RÀNG TRÊN NỀN BÊN PHẢI HEADER */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
          <span className="text-xs font-black tracking-wider text-slate-100 uppercase">
            GĐ1 - KÈO HÔM NAY
          </span>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;