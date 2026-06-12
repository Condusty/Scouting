import { create } from 'zustand';
import type { Season, CreateSeasonDTO } from '@shared/types';
import { seasonsApi } from '@renderer/api/seasons.api';

interface SeasonsStore {
  seasons: Season[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (data: CreateSeasonDTO) => Promise<void>;
  update: (id: number, data: Partial<Season>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useSeasonsStore = create<SeasonsStore>((set, get) => ({
  seasons: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ seasons: await seasonsApi.list(), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (data) => {
    await seasonsApi.create(data);
    await get().load();
  },
  update: async (id, data) => {
    await seasonsApi.update(id, data);
    await get().load();
  },
  remove: async (id) => {
    await seasonsApi.delete(id);
    await get().load();
  },
}));
