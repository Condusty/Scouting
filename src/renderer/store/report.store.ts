import { create } from 'zustand';
import { buildMatchReport, buildServeFlows } from '@renderer/lib/stats-engine';
import type { MatchReportData, ServeZoneFlow } from '@renderer/lib/stats-engine';
import { reportApi } from '@renderer/api/report.api';

interface ReportStore {
  matchId: number | null;
  reportData: MatchReportData | null;
  serveFlowsHome: ServeZoneFlow[];
  serveFlowsAway: ServeZoneFlow[];
  loading: boolean;
  error: string | null;
  load: (matchId: number) => Promise<void>;
}

export const useReportStore = create<ReportStore>((set) => ({
  matchId: null,
  reportData: null,
  serveFlowsHome: [],
  serveFlowsAway: [],
  loading: false,
  error: null,

  load: async (matchId) => {
    set({ loading: true, error: null, matchId });
    try {
      const [actions, rallies] = await Promise.all([
        reportApi.listActions(matchId),
        reportApi.listRallies(matchId),
      ]);
      set({
        reportData: buildMatchReport(actions, rallies),
        serveFlowsHome: buildServeFlows(actions.filter((a) => a.team === 'home')),
        serveFlowsAway: buildServeFlows(actions.filter((a) => a.team === 'away')),
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
