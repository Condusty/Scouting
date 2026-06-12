import type { CreateMatchDTO, Match } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/matches.repo';

export function registerMatchesIPC(): void {
  handle(IPC.MATCHES_LIST, (_e, { season_id }: { season_id?: number } = {}) =>
    repo.listMatches(getDb(), season_id),
  );
  handle(IPC.MATCHES_GET, (_e, { id }: { id: number }) => repo.getMatch(getDb(), id));
  handle(IPC.MATCHES_CREATE, (_e, dto: CreateMatchDTO) => repo.createMatch(getDb(), dto));
  handle(IPC.MATCHES_UPDATE, (_e, { id, ...fields }: Partial<Match> & { id: number }) =>
    repo.updateMatch(getDb(), id, fields),
  );
  handle(IPC.MATCHES_DELETE, (_e, { id }: { id: number }) => repo.deleteMatch(getDb(), id));
}
