import { ClipboardCheck } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
          <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">SOP Master</h1>
          <p className="text-xs text-slate-500">2026-2027 Season</p>
        </div>
      </div>
    </header>
  );
}
