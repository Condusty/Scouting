import { IPC } from '@shared/ipc-channels';
import type { MatchRow, MatchDetail, CreateMatchDTO, Match } from '@shared/types';

export const matchesApi = {
  list: (seasonId?: number) => window.ipc.invoke<MatchRow[]>(IPC.MATCHES_LIST, { season_id: seasonId }),
  get: (id: number) => window.ipc.invoke<MatchDetail>(IPC.MATCHES_GET, { id }),
  create: (data: CreateMatchDTO) => window.ipc.invoke<MatchDetail>(IPC.MATCHES_CREATE, data),
  update: (id: number, data: Partial<Match>) =>
    window.ipc.invoke<MatchDetail>(IPC.MATCHES_UPDATE, { id, ...data }),
  delete: (id: number) => window.ipc.invoke<void>(IPC.MATCHES_DELETE, { id }),
};
