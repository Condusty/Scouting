import { IPC } from '@shared/ipc-channels';
import type {
  Rally,
  ParsedAction,
  CreateRallyDTO,
  CreateSubstitutionDTO,
  CreateTimeoutDTO,
} from '@shared/types';

export const scoutingApi = {
  createRally: (dto: CreateRallyDTO, actions: ParsedAction[]) =>
    window.ipc.invoke<Rally>(IPC.RALLY_CREATE, { dto, actions }),
  deleteRally: (id: number) => window.ipc.invoke<void>(IPC.RALLY_DELETE, { id }),
  listRallies: (matchId: number, setNumber: number) =>
    window.ipc.invoke<Rally[]>(IPC.RALLIES_LIST, { matchId, setNumber }),
  createSub: (dto: CreateSubstitutionDTO) => window.ipc.invoke<void>(IPC.SUB_CREATE, dto),
  createTimeout: (dto: CreateTimeoutDTO) => window.ipc.invoke<void>(IPC.TIMEOUT_CREATE, dto),
};
