import { IPC } from '@shared/ipc-channels';
import type { TeamPlayer, RosterEntryInput } from '@shared/types';

type RosterPatch = Partial<{ shirt_number: number; is_libero: boolean; is_setter: boolean }>;

export const rosterApi = {
  get: (teamId: number) => window.ipc.invoke<TeamPlayer[]>(IPC.ROSTER_GET, { team_id: teamId }),
  add: (input: RosterEntryInput) => window.ipc.invoke<TeamPlayer>(IPC.ROSTER_ADD_PLAYER, input),
  update: (teamId: number, playerId: number, fields: RosterPatch) =>
    window.ipc.invoke<TeamPlayer>(IPC.ROSTER_UPDATE, { team_id: teamId, player_id: playerId, ...fields }),
  remove: (teamId: number, playerId: number) =>
    window.ipc.invoke<void>(IPC.ROSTER_REMOVE_PLAYER, { team_id: teamId, player_id: playerId }),
};
