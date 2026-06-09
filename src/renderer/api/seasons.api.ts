import { IPC } from '@shared/ipc-channels';
import type { Season, CreateSeasonDTO } from '@shared/types';

export const seasonsApi = {
  list: () =>
    window.ipc.invoke<Season[]>(IPC.SEASONS_LIST),
  create: (data: CreateSeasonDTO) =>
    window.ipc.invoke<Season>(IPC.SEASONS_CREATE, data),
  update: (id: number, data: Partial<Season>) =>
    window.ipc.invoke<Season>(IPC.SEASONS_UPDATE, { id, ...data }),
  delete: (id: number) =>
    window.ipc.invoke<void>(IPC.SEASONS_DELETE, { id }),
};
