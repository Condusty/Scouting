import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/report.repo';

export function registerReportIPC(): void {
  handle(IPC.ACTIONS_LIST, (_e, { matchId }: { matchId: number }) =>
    repo.listActionsForMatch(getDb(), matchId),
  );
  handle(IPC.RALLIES_LIST_ALL, (_e, { matchId }: { matchId: number }) =>
    repo.listRalliesForMatch(getDb(), matchId),
  );
}
