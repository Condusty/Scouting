import { registerSeasonsIPC } from './seasons.ipc';
import { registerTeamsIPC } from './teams.ipc';

export function registerAllIPC(): void {
  registerSeasonsIPC();
  registerTeamsIPC();
}
