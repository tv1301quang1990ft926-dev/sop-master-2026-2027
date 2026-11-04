import type { PhaseTab } from '@/constants/phases';

interface PhasePlaceholderViewProps {
  phase: PhaseTab;
}

export default function PhasePlaceholderView({ phase }: PhasePlaceholderViewProps) {
  const Icon = phase.icon;

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-800">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-slate-900">
        {phase.code} {phase.name}
      </h2>
      <p className="max-w-xs text-sm leading-relaxed text-slate-600">
        This phase is ready. Its content will appear here once it is set up.
      </p>
    </section>
  );
}
