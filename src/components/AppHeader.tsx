mport React from 'react';
import { ShieldCheck, Globe } from 'lucide-react';

interface AppHeaderProps {
  selectedTimezone?: number;
  onTimezoneChange?: (tz: number) => void;
}

export function AppHeader({ selectedTimezone = 7, onTimezoneChange }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#151923]/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* LOGO SOP MASTER BÊN TRÁI NGUYÊN BẢN */}
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

        {/* BÊN PHẢI (Ô SỐ 1): DROPDOWN THẢ XUỐNG CHỌN MÚI GIỜ (ĐÃ XÓA 100% Ô SỐ 2) */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs text-slate-200 shadow-sm">
          <Globe className="h-4 w-4 text-cyan-400" />
          <select
            value={selectedTimezone}
            onChange={(e) => onTimezoneChange && onTimezoneChange(Number(e.target.value))}
            className="bg-transparent font-bold text-cyan-300 focus:outline-none cursor-pointer text-xs"
          >
            <option value={7} className="bg-[#151923] text-slate-100">GMT+7 (Việt Nam)</option>
            <option value={8} className="bg-[#151923] text-slate-100">GMT+8 (Trung Quốc/Singapore)</option>
            <option value={9} className="bg-[#151923] text-slate-100">GMT+9 (Nhật Bản/Hàn Quốc)</option>
            <option value={1} className="bg-[#151923] text-slate-100">GMT+1 (Anh/Châu Âu CET)</option>
            <option value={2} className="bg-[#151923] text-slate-100">GMT+2 (Đông Âu EET)</option>
            <option value={0} className="bg-[#151923] text-slate-100">GMT+0 (UTC)</option>
          </select>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;