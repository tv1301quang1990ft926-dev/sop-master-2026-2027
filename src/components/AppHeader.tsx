import React from 'react';
import { ShieldCheck, Globe } from 'lucide-react';

interface AppHeaderProps {
  selectedGmt: number;
  onGmtChange: (gmt: number) => void;
}

export function AppHeader({ selectedGmt, onGmtChange }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#151923]/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* LOGO CHỮ NEON CYAN + MÙA GIẢI */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              SOP MASTER
            </span>
            <span className="text-[10px] font-medium text-slate-400">2026-2027 Season</span>
          </div>
        </div>

        {/* DROPDOWN GMT MẶC ĐỊNH GMT+7 */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-xs font-semibold text-cyan-400 bg-cyan-950/80 border border-cyan-700/50 px-2.5 py-1 rounded-full shadow">
            GĐ1 • KÈO HÔM NAY
          </span>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-cyan-500/40 px-2 py-1 rounded-lg shadow-sm">
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <select
              value={selectedGmt}
              onChange={(e) => onGmtChange(Number(e.target.value))}
              className="bg-transparent text-cyan-300 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value={7} className="bg-slate-900 text-slate-100">Viet Nam (GMT+7)</option>
              <option value={8} className="bg-slate-900 text-slate-100">GMT+8 (Singapore/TQ)</option>
              <option value={9} className="bg-slate-900 text-slate-100">GMT+9 (Nhat Ban)</option>
              <option value={0} className="bg-slate-900 text-slate-100">GMT+0 (UTC/Anh)</option>
              <option value={1} className="bg-slate-900 text-slate-100">GMT+1 (Tay Au)</option>
              <option value={2} className="bg-slate-900 text-slate-100">GMT+2 (Dong Au)</option>
              <option value={3} className="bg-slate-900 text-slate-100">GMT+3 (Qatar)</option>
              <option value={4} className="bg-slate-900 text-slate-100">GMT+4 (Dubai)</option>
              <option value={-5} className="bg-slate-900 text-slate-100">GMT-5 (EST)</option>
              <option value={-8} className="bg-slate-900 text-slate-100">GMT-8 (PST)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;