import { IPC } from '@shared/ipc-channels';
import type { Player, CreatePlayerDTO } from '@shared/types';

export const playersApi = {
  list: () => window.ipc.invoke<Player[]>(IPC.PLAYERS_LIST),
  create: (data: CreatePlayerDTO) => window.ipc.invoke<Player>(IPC.PLAYERS_CREATE, data),
  update: (id: number, data: Partial<Player>) =>
    window.ipc.invoke<Player>(IPC.PLAYERS_UPDATE, { id, ...data }),
  delete: (id: number) => window.ipc.invoke<void>(IPC.PLAYERS_DELETE, { id }),
};
