import { create } from 'zustand';
import type { MatchRow, CreateMatchDTO, Match } from '@shared/types';
import { matchesApi } from '@renderer/api/matches.api';

interface MatchesStore {
  matches: MatchRow[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (data: CreateMatchDTO) => Promise<void>;
  update: (id: number, data: Partial<Match>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useMatchesStore = create<MatchesStore>((set, get) => ({
  matches: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ matches: await matchesApi.list(), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (data) => {
    await matchesApi.create(data);
    await get().load();
  },
  update: async (id, data) => {
    await matchesApi.update(id, data);
    await get().load();
  },
  remove: async (id) => {
    await matchesApi.delete(id);
    await get().load();
  },
}));
