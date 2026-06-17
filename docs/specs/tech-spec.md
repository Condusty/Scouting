# Volleyball Scouting App — Tech Spec

> Source of truth for DB schema, module structure, IPC interfaces, and state management.
> Feature plan: `volleystation_feature_overview.html` (3 phases, 9 sections)

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Desktop shell | Electron 30+ | Cross-platform, mature ecosystem, Node.js access |
| UI framework | React 18 + TypeScript | Component reuse, ecosystem, type safety |
| Build | Vite + electron-builder | Fast HMR, small bundles |
| Routing | React Router v6 | Tab-based navigation needs routes |
| State | Zustand 4 | Minimal boilerplate, fine-grained subscriptions |
| DB | SQLite via better-sqlite3 | Offline-first, synchronous API, single file |
| Migrations | custom sequential `.sql` files | Simple, auditable, no ORM overhead |
| Styling | Tailwind CSS + shadcn/ui | Design system without opinionated components |
| Charts | Recharts | React-native, composable |
| Testing | Vitest (unit) + Playwright (E2E) | Fast unit tests, Electron-compatible E2E |
| DVW parsing | custom parser (no library) | Format is simple fixed-width text |

---

## Directory Structure

```
scouting/
├── src/
│   ├── main/                          # Electron main process (Node.js)
│   │   ├── index.ts                   # App bootstrap, BrowserWindow
│   │   ├── ipc/
│   │   │   ├── registry.ts            # Register all IPC handlers
│   │   │   ├── seasons.ipc.ts
│   │   │   ├── teams.ipc.ts
│   │   │   ├── players.ipc.ts
│   │   │   ├── matches.ipc.ts
│   │   │   ├── scouting.ipc.ts        # Rally + action writes
│   │   │   ├── reports.ipc.ts         # Read-only queries
│   │   │   ├── dvw.ipc.ts             # Import/export
│   │   │   └── video.ipc.ts
│   │   └── db/
│   │       ├── connection.ts          # SQLite singleton
│   │       ├── migrate.ts             # Migration runner
│   │       └── migrations/
│   │           ├── 001_initial.sql
│   │           ├── 002_video_sync.sql
│   │           └── 003_flags.sql
│   │
│   ├── renderer/                      # React app (browser context)
│   │   ├── main.tsx
│   │   ├── App.tsx                    # Router root
│   │   ├── preload.ts                 # Electron contextBridge
│   │   │
│   │   ├── api/                       # IPC wrappers (renderer → main)
│   │   │   ├── seasons.api.ts
│   │   │   ├── teams.api.ts
│   │   │   ├── players.api.ts
│   │   │   ├── matches.api.ts
│   │   │   ├── scouting.api.ts
│   │   │   ├── reports.api.ts
│   │   │   ├── dvw.api.ts
│   │   │   └── video.api.ts
│   │   │
│   │   ├── store/                     # Zustand stores
│   │   │   ├── ui.store.ts
│   │   │   ├── seasons.store.ts
│   │   │   ├── teams.store.ts
│   │   │   ├── players.store.ts
│   │   │   ├── matches.store.ts
│   │   │   └── scouting.store.ts
│   │   │
│   │   ├── features/
│   │   │   ├── layout/
│   │   │   │   ├── TabBar.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── StatusBar.tsx
│   │   │   │
│   │   │   ├── seasons/
│   │   │   │   ├── SeasonList.tsx
│   │   │   │   └── SeasonForm.tsx
│   │   │   │
│   │   │   ├── teams/
│   │   │   │   ├── TeamList.tsx
│   │   │   │   ├── TeamForm.tsx
│   │   │   │   └── TeamRoster.tsx     # Drag & drop lineup
│   │   │   │
│   │   │   ├── players/
│   │   │   │   ├── PlayerList.tsx
│   │   │   │   └── PlayerForm.tsx
│   │   │   │
│   │   │   ├── matches/
│   │   │   │   ├── MatchList.tsx
│   │   │   │   ├── MatchForm.tsx
│   │   │   │   └── MatchImport.tsx
│   │   │   │
│   │   │   ├── scouting/
│   │   │   │   ├── ScoutingView.tsx   # Layout orchestrator
│   │   │   │   ├── CommandLine.tsx    # Code text input (THE core component)
│   │   │   │   ├── RallyLog.tsx       # Scrollable code list
│   │   │   │   ├── ScoreBoard.tsx
│   │   │   │   ├── RotationDisplay.tsx
│   │   │   │   └── ValidationErrors.tsx
│   │   │   │
│   │   │   ├── cards/
│   │   │   │   ├── CardsView.tsx
│   │   │   │   └── BasicCard.tsx
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── MatchReport.tsx
│   │   │   │   ├── PlayerStats.tsx
│   │   │   │   ├── RotationAnalysis.tsx
│   │   │   │   └── SetterReport.tsx
│   │   │   │
│   │   │   └── video/
│   │   │       ├── VideoPlayer.tsx
│   │   │       └── VideoAnalysis.tsx
│   │   │
│   │   └── lib/
│   │       ├── code-parser.ts         # Raw code string → ParsedAction[]
│   │       ├── code-validator.ts      # ParsedAction[] → ValidationError[]
│   │       ├── dvw-parser.ts          # .dvw file → DB import data
│   │       ├── dvw-writer.ts          # DB data → .dvw string
│   │       └── stats-engine.ts        # Actions[] → stat aggregations
│   │
├── tests/
│   ├── unit/
│   │   ├── code-parser.test.ts
│   │   ├── code-validator.test.ts
│   │   ├── dvw-parser.test.ts
│   │   └── stats-engine.test.ts
│   └── e2e/
│       ├── data-management.spec.ts
│       └── scouting.spec.ts
│
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Database Schema

```sql
-- Migration 001_initial.sql

CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────
-- SEASONS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  code             TEXT    NOT NULL UNIQUE,  -- e.g. "2024-25"
  start_date       TEXT,                      -- ISO date string
  end_date         TEXT,
  default_video_dir TEXT,
  created_at       TEXT    DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────
-- TEAMS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  code       TEXT    NOT NULL UNIQUE,  -- 3-letter code e.g. "VCB"
  coach      TEXT,
  created_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS season_teams (
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id   INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
  PRIMARY KEY (season_id, team_id)
);

-- merge tracking: when two teams are merged, old_id points to survivor
CREATE TABLE IF NOT EXISTS team_merges (
  old_id INTEGER NOT NULL,
  new_id INTEGER NOT NULL REFERENCES teams(id),
  merged_at TEXT DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────
-- PLAYERS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL UNIQUE,   -- e.g. "SMI-JOH" (used in coding system)
  first_name TEXT    NOT NULL,
  last_name  TEXT    NOT NULL,
  position   TEXT    CHECK(position IN ('OH','MB','OPP','S','L','DS',NULL)),
  height_cm  INTEGER,
  weight_kg  REAL,
  reach_cm   INTEGER,
  photo_path TEXT,
  created_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS player_merges (
  old_id    INTEGER NOT NULL,
  new_id    INTEGER NOT NULL REFERENCES players(id),
  merged_at TEXT DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────
-- TEAM ROSTERS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_players (
  team_id      INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
  player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  shirt_number INTEGER NOT NULL,
  is_libero    INTEGER NOT NULL DEFAULT 0,  -- BOOLEAN (0/1)
  is_setter    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (team_id, player_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_number
  ON team_players(team_id, shirt_number);

-- ────────────────────────────────────────────────────────
-- MATCHES
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id        INTEGER REFERENCES seasons(id),
  home_team_id     INTEGER NOT NULL REFERENCES teams(id),
  away_team_id     INTEGER NOT NULL REFERENCES teams(id),
  match_date       TEXT,           -- ISO date string
  venue            TEXT,
  video_path       TEXT,           -- absolute local path or URL
  video_offset_ms  INTEGER DEFAULT 0,  -- shift all video timestamps by N ms
  comment          TEXT,
  dvw_source_file  TEXT,           -- original filename if imported
  created_at       TEXT    DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────
-- SETS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sets (
  match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number  INTEGER NOT NULL CHECK(set_number BETWEEN 1 AND 5),
  home_score  INTEGER NOT NULL DEFAULT 0,
  away_score  INTEGER NOT NULL DEFAULT 0,
  duration_min INTEGER,
  PRIMARY KEY (match_id, set_number)
);

-- ────────────────────────────────────────────────────────
-- RALLIES
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rallies (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id             INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number           INTEGER NOT NULL,
  rally_number         INTEGER NOT NULL,   -- sequential within set, 1-based
  rotation_home        INTEGER CHECK(rotation_home BETWEEN 1 AND 6),
  rotation_away        INTEGER CHECK(rotation_away BETWEEN 1 AND 6),
  point_team           TEXT    CHECK(point_team IN ('home','away', NULL)),
  home_score_after     INTEGER,
  away_score_after     INTEGER,
  video_time_ms        INTEGER,            -- start timestamp in video
  raw_input            TEXT,               -- full original code string entered by user
  UNIQUE(match_id, set_number, rally_number)
);

CREATE INDEX IF NOT EXISTS idx_rallies_match ON rallies(match_id, set_number);

-- ────────────────────────────────────────────────────────
-- ACTIONS
-- Each coded skill within a rally (serve, reception, attack, etc.)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  rally_id        INTEGER NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
  action_order    INTEGER NOT NULL,          -- position within rally, 0-based
  team            TEXT    NOT NULL CHECK(team IN ('home','away')),
  player_number   INTEGER,                   -- shirt number (denormalized)
  player_id       INTEGER REFERENCES players(id),
  skill           TEXT    NOT NULL CHECK(skill IN ('S','R','A','B','D','E','F')),
  -- S=Serve, R=Reception, A/X/V=Attack, B=Block, D=Dig, E=Set, F=Freeball
  skill_subtype   TEXT,    -- serve: M/Q/P; attack: combination code
  start_zone      INTEGER CHECK(start_zone BETWEEN 1 AND 9),
  end_zone        INTEGER CHECK(end_zone BETWEEN 1 AND 9),
  effect          TEXT    CHECK(effect IN ('#','+','!','-','/','=', NULL)),
  -- #=excellent/ace, +=positive, !=neutral, -=negative, /=overpass/freeball, ==error
  linked_id       INTEGER REFERENCES actions(id),  -- attack → block link
  video_time_ms   INTEGER,
  raw_token       TEXT,    -- the code substring this action was parsed from
  UNIQUE(rally_id, action_order)
);

CREATE INDEX IF NOT EXISTS idx_actions_rally   ON actions(rally_id);
CREATE INDEX IF NOT EXISTS idx_actions_player  ON actions(player_id);
CREATE INDEX IF NOT EXISTS idx_actions_skill   ON actions(skill, effect);

-- ────────────────────────────────────────────────────────
-- SUBSTITUTIONS & TIMEOUTS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS substitutions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id         INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number       INTEGER NOT NULL,
  after_rally      INTEGER NOT NULL,  -- after which rally_number it occurred
  team             TEXT    NOT NULL CHECK(team IN ('home','away')),
  player_out_num   INTEGER NOT NULL,
  player_in_num    INTEGER NOT NULL,
  video_time_ms    INTEGER
);

CREATE TABLE IF NOT EXISTS timeouts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id      INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number    INTEGER NOT NULL,
  after_rally   INTEGER NOT NULL,
  team          TEXT    NOT NULL CHECK(team IN ('home','away')),
  video_time_ms INTEGER
);

-- ────────────────────────────────────────────────────────
-- RALLY FLAGS (video annotation, Phase 2+)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rally_flags (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  rally_id     INTEGER NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
  flag_number  INTEGER NOT NULL CHECK(flag_number BETWEEN 1 AND 6),
  category     TEXT,
  note         TEXT,
  UNIQUE(rally_id, flag_number)
);

-- ────────────────────────────────────────────────────────
-- USER CONFIG (Phase 2+)
-- Key-value store for settings, custom keybindings, default codes
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,  -- JSON-encoded
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO migrations(version) VALUES (1);
```

---

## TypeScript Types (shared between main + renderer)

```typescript
// src/shared/types.ts

export type Skill = 'S' | 'R' | 'A' | 'B' | 'D' | 'E' | 'F';
export type Effect = '#' | '+' | '!' | '-' | '/' | '=';
export type Team = 'home' | 'away';
export type Position = 'OH' | 'MB' | 'OPP' | 'S' | 'L' | 'DS';

export interface Season {
  id: number;
  name: string;
  code: string;
  start_date: string | null;
  end_date: string | null;
  default_video_dir: string | null;
  created_at: string;
}

export interface TeamRecord {
  id: number;
  name: string;
  code: string;
  coach: string | null;
  created_at: string;
}

export interface Player {
  id: number;
  code: string;
  first_name: string;
  last_name: string;
  position: Position | null;
  height_cm: number | null;
  weight_kg: number | null;
  reach_cm: number | null;
  photo_path: string | null;
  created_at: string;
}

export interface TeamPlayer extends Player {
  shirt_number: number;
  is_libero: boolean;
  is_setter: boolean;
}

export interface Match {
  id: number;
  season_id: number | null;
  home_team_id: number;
  away_team_id: number;
  match_date: string | null;
  venue: string | null;
  video_path: string | null;
  video_offset_ms: number;
  comment: string | null;
  dvw_source_file: string | null;
  created_at: string;
}

export interface Rally {
  id: number;
  match_id: number;
  set_number: number;
  rally_number: number;
  rotation_home: number | null;
  rotation_away: number | null;
  point_team: Team | null;
  home_score_after: number | null;
  away_score_after: number | null;
  video_time_ms: number | null;
  raw_input: string | null;
  actions: Action[];
}

export interface Action {
  id: number;
  rally_id: number;
  action_order: number;
  team: Team;
  player_number: number | null;
  player_id: number | null;
  skill: Skill;
  skill_subtype: string | null;
  start_zone: number | null;
  end_zone: number | null;
  effect: Effect | null;
  linked_id: number | null;
  video_time_ms: number | null;
  raw_token: string | null;
}

// DTO types for creates
export type CreateSeasonDTO  = Omit<Season,  'id' | 'created_at'>;
export type CreateTeamDTO    = Omit<TeamRecord, 'id' | 'created_at'>;
export type CreatePlayerDTO  = Omit<Player,  'id' | 'created_at'>;
export type CreateMatchDTO   = Omit<Match,   'id' | 'created_at'>;
```

---

## IPC API Interfaces

All IPC goes through Electron's `contextBridge`. One channel per operation.

```typescript
// src/shared/ipc-channels.ts

export const IPC = {
  // Seasons
  SEASONS_LIST:   'seasons:list',
  SEASONS_CREATE: 'seasons:create',
  SEASONS_UPDATE: 'seasons:update',
  SEASONS_DELETE: 'seasons:delete',

  // Teams
  TEAMS_LIST:   'teams:list',
  TEAMS_CREATE: 'teams:create',
  TEAMS_UPDATE: 'teams:update',
  TEAMS_DELETE: 'teams:delete',
  TEAMS_MERGE:  'teams:merge',

  // Players
  PLAYERS_LIST:   'players:list',
  PLAYERS_CREATE: 'players:create',
  PLAYERS_UPDATE: 'players:update',
  PLAYERS_DELETE: 'players:delete',
  PLAYERS_MERGE:  'players:merge',

  // Roster
  ROSTER_GET:          'roster:get',
  ROSTER_ADD_PLAYER:   'roster:add-player',
  ROSTER_REMOVE_PLAYER:'roster:remove-player',
  ROSTER_UPDATE:       'roster:update',

  // Matches
  MATCHES_LIST:   'matches:list',
  MATCHES_CREATE: 'matches:create',
  MATCHES_UPDATE: 'matches:update',
  MATCHES_DELETE: 'matches:delete',
  MATCHES_GET:    'matches:get',

  // Scouting (write-heavy)
  RALLY_CREATE:   'rally:create',
  RALLY_DELETE:   'rally:delete',
  ACTION_CREATE:  'action:create',
  ACTION_DELETE:  'action:delete',
  ACTION_INSERT:  'action:insert',    // insert before position
  SUB_CREATE:     'sub:create',
  TIMEOUT_CREATE: 'timeout:create',

  // Reports (read-only)
  REPORT_MATCH:        'report:match',
  REPORT_PLAYER_STATS: 'report:player-stats',
  REPORT_ROTATION:     'report:rotation',
  REPORT_SETTER:       'report:setter',

  // DVW
  DVW_IMPORT: 'dvw:import',
  DVW_EXPORT: 'dvw:export',

  // Video
  VIDEO_LINK:   'video:link',
  VIDEO_PICK:   'video:pick',    // open file picker, returns path
} as const;
```

```typescript
// src/shared/ipc-types.ts — request/response shapes per channel

export interface IPCMap {
  'seasons:list':   { req: { season_id?: number }; res: Season[] };
  'seasons:create': { req: CreateSeasonDTO;         res: Season };
  'seasons:update': { req: Partial<Season> & { id: number }; res: Season };
  'seasons:delete': { req: { id: number };          res: void };

  'teams:list':   { req: { season_id?: number };    res: TeamRecord[] };
  'teams:create': { req: CreateTeamDTO;             res: TeamRecord };
  'teams:update': { req: Partial<TeamRecord> & { id: number }; res: TeamRecord };
  'teams:delete': { req: { id: number };            res: void };
  'teams:merge':  { req: { old_id: number; new_id: number }; res: void };

  'players:list':   { req: { team_id?: number };    res: Player[] };
  'players:create': { req: CreatePlayerDTO;         res: Player };
  'players:update': { req: Partial<Player> & { id: number }; res: Player };
  'players:delete': { req: { id: number };          res: void };
  'players:merge':  { req: { old_id: number; new_id: number }; res: void };

  'roster:get':           { req: { team_id: number };              res: TeamPlayer[] };
  'roster:add-player':    { req: { team_id: number; player_id: number; shirt_number: number; is_libero: boolean; is_setter: boolean }; res: TeamPlayer };
  'roster:remove-player': { req: { team_id: number; player_id: number }; res: void };

  'matches:list':   { req: { season_id?: number };  res: Match[] };
  'matches:get':    { req: { id: number };           res: Match & { home_team: TeamRecord; away_team: TeamRecord } };
  'matches:create': { req: CreateMatchDTO;           res: Match };
  'matches:update': { req: Partial<Match> & { id: number }; res: Match };
  'matches:delete': { req: { id: number };           res: void };

  'rally:create':  { req: { match_id: number; set_number: number; rally_number: number; raw_input: string }; res: Rally };
  'rally:delete':  { req: { id: number }; res: void };
  'action:create': { req: Omit<Action, 'id'>; res: Action };
  'action:delete': { req: { id: number }; res: void };

  'report:match': {
    req: { match_id: number };
    res: MatchReportData;
  };
  'report:player-stats': {
    req: { match_id?: number; season_id?: number; player_id?: number };
    res: PlayerStatRow[];
  };

  'dvw:import': { req: { file_path: string; season_id: number }; res: { match_id: number; warnings: string[] } };
  'dvw:export': { req: { match_id: number; file_path: string };  res: void };

  'video:link': { req: { match_id: number; file_path: string }; res: void };
  'video:pick': { req: {}; res: string | null };
}
```

---

## State Management (Zustand)

### `ui.store.ts`

```typescript
export type Layout = 'scout' | 'show' | 'synchronize';

export interface Tab {
  id: string;           // uuid
  type: 'home' | 'match' | 'season' | 'team' | 'player' | 'report';
  label: string;
  params: Record<string, unknown>;
  isDirty: boolean;
}

interface UIStore {
  tabs: Tab[];
  activeTabId: string | null;
  layout: Layout;
  sidebarOpen: boolean;

  openTab: (config: Omit<Tab, 'id' | 'isDirty'>) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setLayout: (layout: Layout) => void;
  markDirty: (tabId: string) => void;
  markClean: (tabId: string) => void;
}
```

### `scouting.store.ts`

```typescript
export interface ScoutingSession {
  matchId: number;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  rotationHome: number;   // 1-6
  rotationAway: number;
  homeTeamId: number;
  awayTeamId: number;
  homeRoster: TeamPlayer[];
  awayRoster: TeamPlayer[];
}

export interface ValidationError {
  token: string;
  message: string;
  position: number;  // char offset in raw input
}

interface ScoutingStore {
  session: ScoutingSession | null;
  rallies: Rally[];                  // all rallies for current match/set
  currentInput: string;
  validationErrors: ValidationError[];
  pendingRally: ParsedRally | null;  // parsed but not yet committed

  startSession: (matchId: number, setNumber: number) => Promise<void>;
  setInput: (raw: string) => void;
  submitCode: (raw: string, forceInvalid?: boolean) => Promise<void>;
  undoLastRally: () => Promise<void>;
  deleteAction: (actionId: number) => Promise<void>;
  switchSides: () => void;
  nextSet: () => void;
}
```

### `matches.store.ts`

```typescript
interface MatchesStore {
  matches: Match[];
  loading: boolean;
  error: string | null;

  loadMatches: (seasonId?: number) => Promise<void>;
  createMatch: (data: CreateMatchDTO) => Promise<Match>;
  updateMatch: (id: number, data: Partial<Match>) => Promise<Match>;
  deleteMatch: (id: number) => Promise<void>;
  importDvw: (filePath: string, seasonId: number) => Promise<{ match_id: number; warnings: string[] }>;
}
```

---

## Code Parser — Algorithm

The `CommandLine` input accepts DataVolley-style notation. Parsing rules:

```
RALLY       := ACTION ('.' ACTION)* POINT?
ACTION      := TEAM? PLAYER SKILL [SUBTYPE] [ZONE_START] [EFFECT] [ZONE_END]
TEAM        := 'a'  (absent = home)
PLAYER      := [0-9]{1,2}
SKILL       := 'S'|'R'|'A'|'B'|'D'|'E'|'F'|'X'|'V'   (X/V = attack combos)
SUBTYPE     := for S: 'M'|'Q'|'P'
               for A/X/V: combination string e.g. 'A', 'B', 'C'
ZONE_START  := [1-9] | [A-D]
EFFECT      := '#'|'+'|'!'|'-'|'/'|'='
ZONE_END    := [1-9] | [A-D]
POINT       := '*'  (home wins rally) | 'a*' (away wins)

SUBSTITUTION := 'C' PLAYER ':' PLAYER              (e.g. C11:24)
TEAM_SUB     := 'Ca' PLAYER ':' PLAYER              (away team sub)
TIMEOUT      := 'T' | 'Ta'
SETTER_SIDE  := 'Z' [1-6]                           (set setter rotation)
SIDE_SWITCH  := 'I' [12]                            (sides 1 or 2)

Compound codes:
  '14SR#5'         = home player 14, serve float+jump, excellent, zone 5
  'a7R+3'          = away player 7, reception good, zone 3
  '14SR#5.7R+3'    = serve (home 14) dot reception (home 7)
  '14A#5.a3B+'     = attack (home 14) dot block (away 3)
```

```typescript
// src/renderer/lib/code-parser.ts

export interface ParsedAction {
  team: Team;
  playerNumber: number;
  skill: Skill;
  skillSubtype: string | null;
  startZone: number | null;
  effect: Effect | null;
  endZone: number | null;
  rawToken: string;
}

export interface ParsedRally {
  actions: ParsedAction[];
  pointTeam: Team | null;
  substitutions: { team: Team; out: number; in: number }[];
  timeouts: { team: Team }[];
  rawInput: string;
}

export function parseCode(raw: string): ParsedRally { /* ... */ }
```

---

## DVW Import — Key Notes

DataVolley `.dvw` is a Windows-1252 encoded text file with sections:
- `[3SCOUT]` — the action codes, one per line
- `[3SET]` — set scores
- `[3PLAYERS-H]` / `[3PLAYERS-V]` — home/visitor player lists
- `[3TEAMS]` — team names

Line format in `[3SCOUT]`:
```
*14SR#5~1~0001~*P14SR#5~...
```
Fields tab/tilde-separated. Key fields: team, player number, skill, type, effect, start zone, end zone.

Parser must handle:
1. Encoding: read file as binary, decode with `iconv-lite` (`windows-1252`)
2. Section splitting on `[3SCOUT]` etc.
3. Map DVW skill codes to our schema (`Skill` type)
4. Resolve player numbers to player IDs via roster lookup

---

## Stats Engine — Key Aggregations

```typescript
// src/renderer/lib/stats-engine.ts

export interface SkillStats {
  total: number;
  excellent: number;   // effect '#'
  positive: number;    // effect '+'
  neutral: number;     // effect '!'
  negative: number;    // effect '-'
  error: number;       // effect '='
  efficiency: number;  // (excellent - error) / total
}

export interface MatchReportData {
  homeTeam: TeamStats;
  awayTeam: TeamStats;
  sets: SetScore[];
}

export interface TeamStats {
  serve: SkillStats;
  reception: SkillStats;
  attack: SkillStats;
  block: SkillStats;
  dig: SkillStats;
  set: SkillStats;
  byPlayer: Record<number, PlayerMatchStats>;
}

export interface PlayerStatRow {
  playerId: number;
  playerCode: string;
  name: string;
  matchCount: number;
  serve: SkillStats;
  reception: SkillStats;
  attack: SkillStats;
  block: SkillStats;
  dig: SkillStats;
}
```

---

## Testing Strategy

| What | Tool | Where |
|------|------|-------|
| Code parser | Vitest | `tests/unit/code-parser.test.ts` |
| DVW parser | Vitest | `tests/unit/dvw-parser.test.ts` |
| Stats engine | Vitest | `tests/unit/stats-engine.test.ts` |
| DB migrations | Vitest (in-memory SQLite) | `tests/unit/migrations.test.ts` |
| Data management flows | Playwright | `tests/e2e/data-management.spec.ts` |
| Scouting input flow | Playwright | `tests/e2e/scouting.spec.ts` |

Code parser and stats engine have the most complex logic → highest test priority.

---

## Phase Plan Summary

| Plan file | Scope | Status |
|-----------|-------|--------|
| `2026-06-09-phase-0-scaffold.md` | Electron + Vite + SQLite + tab shell | → next |
| `2026-06-09-phase-1a-data-mgmt.md` | Seasons/Teams/Players/Matches CRUD | todo |
| `2026-06-09-phase-1b-scouting.md` | CommandLine + parser + RallyLog | todo |
| `2026-06-09-phase-1c-reports.md` | MatchReport + PlayerStats | todo |
| `2026-06-09-phase-1d-dvw.md` | DVW import/export | todo |
| `2026-06-09-phase-2-video.md` | Video link + sync + analysis | todo |
| `2026-06-09-phase-2-cards.md` | Cards mode | todo |
| `2026-06-09-phase-3-vql.md` | VQL spreadsheet engine | todo |
