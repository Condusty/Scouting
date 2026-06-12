import { IPC } from '@shared/ipc-channels';
import type { TeamRecord, CreateTeamDTO } from '@shared/types';

export const teamsApi = {
  list: (seasonId?: number) =>
    window.ipc.invoke<TeamRecord[]>(IPC.TEAMS_LIST, { season_id: seasonId }),
  create: (data: CreateTeamDTO) => window.ipc.invoke<TeamRecord>(IPC.TEAMS_CREATE, data),
  update: (id: number, data: Partial<TeamRecord>) =>
    window.ipc.invoke<TeamRecord>(IPC.TEAMS_UPDATE, { id, ...data }),
  delete: (id: number) => window.ipc.invoke<void>(IPC.TEAMS_DELETE, { id }),
};
