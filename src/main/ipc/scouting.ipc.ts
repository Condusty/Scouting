import type {
  ParsedAction,
  CreateRallyDTO,
  UpdateRallyDTO,
  RallyScoringUpdate,
  CreateSubstitutionDTO,
  CreateTimeoutDTO,
} from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/scouting.repo';

export function registerScoutingIPC(): void {
  handle(IPC.RALLY_CREATE, (_e, { dto, actions }: { dto: CreateRallyDTO; actions: ParsedAction[] }) =>
    repo.createRally(getDb(), dto, actions),
  );
  handle(
    IPC.RALLY_UPDATE,
    (
      _e,
      {
        id,
        dto,
        actions,
        subs,
        timeouts,
        cascade,
      }: {
        id: number;
        dto: UpdateRallyDTO;
        actions: ParsedAction[];
        subs: CreateSubstitutionDTO[];
        timeouts: CreateTimeoutDTO[];
        cascade: RallyScoringUpdate[];
      },
    ) => repo.updateRally(getDb(), id, dto, actions, subs, timeouts, cascade),
  );
  handle(IPC.RALLY_DELETE, (_e, { id }: { id: number }) => repo.deleteRally(getDb(), id));
  handle(IPC.RALLIES_LIST, (_e, { matchId, setNumber }: { matchId: number; setNumber: number }) =>
    repo.listRallies(getDb(), matchId, setNumber),
  );
  handle(IPC.SUB_CREATE, (_e, dto: CreateSubstitutionDTO) => repo.createSubstitution(getDb(), dto));
  handle(IPC.TIMEOUT_CREATE, (_e, dto: CreateTimeoutDTO) => repo.createTimeout(getDb(), dto));
}
