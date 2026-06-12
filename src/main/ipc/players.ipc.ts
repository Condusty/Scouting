import type { CreatePlayerDTO, Player } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/players.repo';

export function registerPlayersIPC(): void {
  handle(IPC.PLAYERS_LIST, () => repo.listPlayers(getDb()));
  handle(IPC.PLAYERS_CREATE, (_e, dto: CreatePlayerDTO) => repo.createPlayer(getDb(), dto));
  handle(IPC.PLAYERS_UPDATE, (_e, { id, ...fields }: Partial<Player> & { id: number }) =>
    repo.updatePlayer(getDb(), id, fields),
  );
  handle(IPC.PLAYERS_DELETE, (_e, { id }: { id: number }) => repo.deletePlayer(getDb(), id));
}
