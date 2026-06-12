import type { RosterEntryInput } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/roster.repo';

export function registerRosterIPC(): void {
  handle(IPC.ROSTER_GET, (_e, { team_id }: { team_id: number }) => repo.getRoster(getDb(), team_id));
  handle(IPC.ROSTER_ADD_PLAYER, (_e, input: RosterEntryInput) => repo.addRosterPlayer(getDb(), input));
  handle(
    IPC.ROSTER_UPDATE,
    (_e, { team_id, player_id, ...fields }: { team_id: number; player_id: number } & Partial<{ shirt_number: number; is_libero: boolean; is_setter: boolean }>) =>
      repo.updateRosterPlayer(getDb(), team_id, player_id, fields),
  );
  handle(IPC.ROSTER_REMOVE_PLAYER, (_e, { team_id, player_id }: { team_id: number; player_id: number }) =>
    repo.removeRosterPlayer(getDb(), team_id, player_id),
  );
}
