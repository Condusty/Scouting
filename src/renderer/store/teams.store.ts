import { create } from 'zustand';
import type { TeamRecord, CreateTeamDTO } from '@shared/types';
import { teamsApi } from '@renderer/api/teams.api';

interface TeamsStore {
  teams: TeamRecord[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (data: CreateTeamDTO) => Promise<void>;
  update: (id: number, data: Partial<TeamRecord>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useTeamsStore = create<TeamsStore>((set, get) => ({
  teams: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ teams: await teamsApi.list(), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (data) => {
    await teamsApi.create(data);
    await get().load();
  },
  update: async (id, data) => {
    await teamsApi.update(id, data);
    await get().load();
  },
  remove: async (id) => {
    await teamsApi.delete(id);
    await get().load();
  },
}));
