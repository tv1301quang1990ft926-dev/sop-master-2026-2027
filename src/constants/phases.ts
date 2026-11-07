import { Activity, FileSearch, Flag, Lock, type LucideIcon } from 'lucide-react';
import type { PhaseId } from '@/types';

export interface PhaseTab {
  id: PhaseId;
  code: string;
  name: string;
  icon: LucideIcon;
}

export const PHASE_ORDER: PhaseId[] = ['baseline', 'tracking', 'lockin', 'audit'];

export const PHASES: Record<PhaseId, PhaseTab> = {
  baseline: { id: 'baseline', code: 'GĐ1', name: 'Kèo Hôm Nay', icon: Flag },
  tracking: { id: 'tracking', code: 'GĐ2', name: 'Tracking', icon: Activity },
  lockin: { id: 'lockin', code: 'GĐ3', name: 'Lockin', icon: Lock },
  audit: { id: 'audit', code: 'GĐ4', name: 'Audit', icon: FileSearch },
};
