import React from 'react';
import { PHASES } from '@/constants/phases';
import type { PhaseId } from '@/types';
import { Calendar, Activity, Zap, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  activePhase: PhaseId | string;
  onPhaseChange: (phaseId: PhaseId) => void;
}

const PHASE_ICONS: Record<string, React.ReactNode> = {
  baseline: <Calendar className="h-5 w-5" />,
  tracking: <Activity className="h-5 w-5" />,
  lockin: <Zap className="h-5 w-5" />,
  audit: <BarChart3 className="h-5 w-5" />,
};

export default function BottomNav({ activePhase, onPhaseChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#1b202c]/95 backdrop-blur-md px-2 py-2">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {PHASES.map((phase) => {
          const isActive = activePhase === phase.id || (activePhase === 'movement' && phase.id === 'tracking');
          
          return (
            <button
              key={phase.id}
              onClick={() => onPhaseChange(phase.id as PhaseId)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
                isActive
                  ? 'text-cyan-400 font-bold bg-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {PHASE_ICONS[phase.id] || <Activity className="h-5 w-5" />}
              <span className="text-[10px] mt-1 font-medium">{phase.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}