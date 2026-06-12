import type { CreateTeamDTO, TeamRecord } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/teams.repo';

export function registerTeamsIPC(): void {
  handle(IPC.TEAMS_LIST, (_e, { season_id }: { season_id?: number } = {}) =>
    repo.listTeams(getDb(), season_id),
  );
  handle(IPC.TEAMS_CREATE, (_e, dto: CreateTeamDTO) => repo.createTeam(getDb(), dto));
  handle(IPC.TEAMS_UPDATE, (_e, { id, ...fields }: Partial<TeamRecord> & { id: number }) =>
    repo.updateTeam(getDb(), id, fields),
  );
  handle(IPC.TEAMS_DELETE, (_e, { id }: { id: number }) => repo.deleteTeam(getDb(), id));
}
