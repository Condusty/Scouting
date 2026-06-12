import { registerSeasonsIPC } from './seasons.ipc';
import { registerTeamsIPC } from './teams.ipc';
import { registerPlayersIPC } from './players.ipc';
import { registerRosterIPC } from './roster.ipc';
import { registerMatchesIPC } from './matches.ipc';

export function registerAllIPC(): void {
  registerSeasonsIPC();
  registerTeamsIPC();
  registerPlayersIPC();
  registerRosterIPC();
  registerMatchesIPC();
}
