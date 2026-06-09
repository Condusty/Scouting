export const IPC = {
  SEASONS_LIST:   'seasons:list',
  SEASONS_CREATE: 'seasons:create',
  SEASONS_UPDATE: 'seasons:update',
  SEASONS_DELETE: 'seasons:delete',

  TEAMS_LIST:   'teams:list',
  TEAMS_CREATE: 'teams:create',
  TEAMS_UPDATE: 'teams:update',
  TEAMS_DELETE: 'teams:delete',
  TEAMS_MERGE:  'teams:merge',

  PLAYERS_LIST:   'players:list',
  PLAYERS_CREATE: 'players:create',
  PLAYERS_UPDATE: 'players:update',
  PLAYERS_DELETE: 'players:delete',
  PLAYERS_MERGE:  'players:merge',

  ROSTER_GET:           'roster:get',
  ROSTER_ADD_PLAYER:    'roster:add-player',
  ROSTER_REMOVE_PLAYER: 'roster:remove-player',

  MATCHES_LIST:   'matches:list',
  MATCHES_GET:    'matches:get',
  MATCHES_CREATE: 'matches:create',
  MATCHES_UPDATE: 'matches:update',
  MATCHES_DELETE: 'matches:delete',

  RALLY_CREATE:   'rally:create',
  RALLY_DELETE:   'rally:delete',
  ACTION_CREATE:  'action:create',
  ACTION_DELETE:  'action:delete',
  ACTION_INSERT:  'action:insert',
  SUB_CREATE:     'sub:create',
  TIMEOUT_CREATE: 'timeout:create',

  REPORT_MATCH:        'report:match',
  REPORT_PLAYER_STATS: 'report:player-stats',

  DVW_IMPORT: 'dvw:import',
  DVW_EXPORT: 'dvw:export',

  VIDEO_LINK: 'video:link',
  VIDEO_PICK: 'video:pick',
} as const;

export type IPCChannel = typeof IPC[keyof typeof IPC];
