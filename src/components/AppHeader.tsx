import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#151923]/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Tên App & Badge tài khoản phía bên trái */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            SOP MASTER 2026–2027
          </span>
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
            FREE
          </span>
        </div>

        {/* Tiêu đề GĐ1 in nổi phía bên phải Header */}
        <div className="text-xs font-black text-cyan-400 tracking-wider uppercase border border-cyan-500/50 bg-cyan-950/80 px-3 py-1 rounded-md shadow-[0_0_12px_rgba(34,211,238,0.4)]">
          GĐ1 - KÈO HÔM NAY
        </div>
      </div>
    </header>
  );
}

export default AppHeader;