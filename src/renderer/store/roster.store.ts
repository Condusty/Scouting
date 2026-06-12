import { create } from 'zustand';
import type { TeamPlayer, RosterEntryInput } from '@shared/types';
import { rosterApi } from '@renderer/api/roster.api';

type RosterPatch = Partial<{ shirt_number: number; is_libero: boolean; is_setter: boolean }>;

interface RosterStore {
  roster: TeamPlayer[];
  error: string | null;
  load: (teamId: number) => Promise<void>;
  add: (input: RosterEntryInput) => Promise<void>;
  update: (teamId: number, playerId: number, fields: RosterPatch) => Promise<void>;
  remove: (teamId: number, playerId: number) => Promise<void>;
}

export const useRosterStore = create<RosterStore>((set, get) => ({
  roster: [],
  error: null,
  load: async (teamId) => {
    try {
      set({ roster: await rosterApi.get(teamId), error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  add: async (input) => {
    try {
      await rosterApi.add(input);
      await get().load(input.team_id);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  update: async (teamId, playerId, fields) => {
    try {
      await rosterApi.update(teamId, playerId, fields);
      await get().load(teamId);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  remove: async (teamId, playerId) => {
    try {
      await rosterApi.remove(teamId, playerId);
      await get().load(teamId);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
