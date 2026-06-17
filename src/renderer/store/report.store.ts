import { create } from 'zustand';
import type { Action, Rally } from '@shared/types';
import { reportApi } from '@renderer/api/report.api';

interface ReportStore {
  matchId: number | null;
  allActions: Action[];
  allRallies: Rally[];
  activeSet: number | null;
  loading: boolean;
  error: string | null;
  load: (matchId: number) => Promise<void>;
  setActiveSet: (n: number | null) => void;
}

export const useReportStore = create<ReportStore>((set) => ({
  matchId: null,
  allActions: [],
  allRallies: [],
  activeSet: null,
  loading: false,
  error: null,

  load: async (matchId) => {
    set({ loading: true, error: null, matchId, activeSet: null });
    try {
      const [actions, rallies] = await Promise.all([
        reportApi.listActions(matchId),
        reportApi.listRallies(matchId),
      ]);
      set({ allActions: actions, allRallies: rallies, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setActiveSet: (n) => set({ activeSet: n }),
}));
