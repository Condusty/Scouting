import { IPC } from '@shared/ipc-channels';
import type {
  Rally,
  ParsedAction,
  CreateRallyDTO,
  UpdateRallyDTO,
  RallyScoringUpdate,
  CreateSubstitutionDTO,
  CreateTimeoutDTO,
  SetRecord,
  UpsertSetDTO,
} from '@shared/types';

export const scoutingApi = {
  createRally: (dto: CreateRallyDTO, actions: ParsedAction[]) =>
    window.ipc.invoke<Rally>(IPC.RALLY_CREATE, { dto, actions }),
  updateRally: (
    id: number,
    dto: UpdateRallyDTO,
    actions: ParsedAction[],
    subs: CreateSubstitutionDTO[],
    timeouts: CreateTimeoutDTO[],
    cascade: RallyScoringUpdate[],
  ) => window.ipc.invoke<Rally[]>(IPC.RALLY_UPDATE, { id, dto, actions, subs, timeouts, cascade }),
  deleteRally: (id: number) => window.ipc.invoke<void>(IPC.RALLY_DELETE, { id }),
  listRallies: (matchId: number, setNumber: number) =>
    window.ipc.invoke<Rally[]>(IPC.RALLIES_LIST, { matchId, setNumber }),
  createSub: (dto: CreateSubstitutionDTO) => window.ipc.invoke<void>(IPC.SUB_CREATE, dto),
  createTimeout: (dto: CreateTimeoutDTO) => window.ipc.invoke<void>(IPC.TIMEOUT_CREATE, dto),
  upsertSet: (dto: UpsertSetDTO) => window.ipc.invoke<void>(IPC.SET_UPSERT, dto),
  getSetsForMatch: (matchId: number) =>
    window.ipc.invoke<SetRecord[]>(IPC.SETS_FOR_MATCH, { matchId }),
};
