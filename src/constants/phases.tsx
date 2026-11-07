import React from 'react';
import type { PhaseId } from '@/types';
import { Calendar, Activity, Zap, BarChart3 } from 'lucide-react';

export interface PhaseTab {
  id: PhaseId;
  code: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PHASES: PhaseTab[] = [
  { id: 'baseline', code: 'GĐ1', name: 'Kèo Hôm Nay', icon: Calendar },
  { id: 'tracking', code: 'GĐ2', name: 'Biến Động', icon: Activity },
  { id: 'lockin', code: 'GĐ3', name: 'Chốt Lệnh', icon: Zap },
  { id: 'audit', code: 'GĐ4', name: 'Kết Quả', icon: BarChart3 },
];

export const PHASE_ORDER: PhaseId[] = PHASES.map((p) => p.id);

export const PHASE_MAP: Record<PhaseId, PhaseTab> = PHASES.reduce(
  (acc, phase) => ({ ...acc, [phase.id]: phase }),
  {} as Record<PhaseId, PhaseTab>,
);
