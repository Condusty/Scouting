import { IPC } from '@shared/ipc-channels';
import type { Action, Rally } from '@shared/types';

export const reportApi = {
  listActions: (matchId: number) => window.ipc.invoke<Action[]>(IPC.ACTIONS_LIST, { matchId }),
  listRallies: (matchId: number) => window.ipc.invoke<Rally[]>(IPC.RALLIES_LIST_ALL, { matchId }),
};
