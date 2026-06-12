import { create } from 'zustand';
import type { Player, CreatePlayerDTO } from '@shared/types';
import { playersApi } from '@renderer/api/players.api';

interface PlayersStore {
  players: Player[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (data: CreatePlayerDTO) => Promise<void>;
  update: (id: number, data: Partial<Player>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const usePlayersStore = create<PlayersStore>((set, get) => ({
  players: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ players: await playersApi.list(), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (data) => {
    await playersApi.create(data);
    await get().load();
  },
  update: async (id, data) => {
    await playersApi.update(id, data);
    await get().load();
  },
  remove: async (id) => {
    await playersApi.delete(id);
    await get().load();
  },
}));
