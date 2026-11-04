import { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import MatchBoard from '@/components/MatchBoard';
import PhasePlaceholderView from '@/components/PhasePlaceholderView';
import { PHASES } from '@/constants/phases';
import type { PhaseId } from '@/types';

function App() {
  const [activePhase, setActivePhase] = useState<PhaseId>('baseline');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
        {activePhase === 'baseline' ? (
          <MatchBoard />
        ) : (
          <PhasePlaceholderView phase={PHASES[activePhase]} />
        )}
      </main>

      <BottomNav activePhase={activePhase} onSelect={setActivePhase} />
    </div>
  );
}

export default App;
