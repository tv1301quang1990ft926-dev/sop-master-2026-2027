import { PHASE_ORDER, PHASES } from '@/constants/phases';
import type { PhaseId } from '@/types';

interface BottomNavProps {
  activePhase: PhaseId;
  onSelect: (phase: PhaseId) => void;
}

export default function BottomNav({ activePhase, onSelect }: BottomNavProps) {
  return (
    <nav
      aria-label="Phases"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {PHASE_ORDER.map((id) => {
          const { code, name, icon: Icon } = PHASES[id];
          const isActive = id === activePhase;

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${code} ${name}`}
                className={`group flex w-full flex-col items-center gap-0.5 py-2 transition-colors duration-200 ${
                  isActive ? 'text-teal-800' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
                    isActive ? 'bg-teal-100' : 'group-hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-semibold leading-tight">{code}</span>
                <span className="text-[11px] leading-tight">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
