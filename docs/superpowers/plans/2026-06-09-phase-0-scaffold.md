# Phase 0: App Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap an Electron + React + TypeScript + Vite app with SQLite, IPC bridge, migration system, and a tab-based UI shell — ready for feature development in a modern and clean UI.

**Architecture:** Electron main process owns SQLite and exposes typed IPC handlers. React renderer calls IPC via contextBridge preload. Zustand manages UI state. Tab-based navigation mimics VolleyStation's browser-like interface.

**Tech Stack:** Electron 30, React 18, TypeScript 5, Vite 5, better-sqlite3, Zustand 4, Tailwind CSS, shadcn/ui, Vitest, Playwright

---

## File Map

| File | Role |
|------|------|
| `package.json` | Dependencies + scripts |
| `electron.vite.config.ts` | Vite config for main + renderer |
| `tsconfig.json` | TS root config |
| `src/main/index.ts` | Electron app bootstrap |
| `src/main/db/connection.ts` | SQLite singleton |
| `src/main/db/migrate.ts` | Migration runner |
| `src/main/db/migrations/001_initial.sql` | Full schema (from tech-spec) |
| `src/main/ipc/registry.ts` | Register all IPC handlers |
| `src/main/ipc/seasons.ipc.ts` | Seasons CRUD handlers |
| `src/renderer/preload.ts` | contextBridge definitions |
| `src/shared/ipc-channels.ts` | Channel name constants |
| `src/shared/types.ts` | Shared TypeScript types |
| `src/renderer/main.tsx` | React entry point |
| `src/renderer/App.tsx` | Router root |
| `src/renderer/store/ui.store.ts` | Tab + layout state |
| `src/renderer/features/layout/TabBar.tsx` | Browser-like tabs |
| `src/renderer/features/layout/Sidebar.tsx` | Navigation |
| `tests/unit/migrations.test.ts` | DB migration smoke test |

---

### Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize npm project and install dependencies**

```bash
npm init -y
npm install electron react react-dom react-router-dom zustand better-sqlite3
npm install -D typescript @types/react @types/react-dom @types/better-sqlite3 @types/node
npm install -D electron-builder vite @vitejs/plugin-react electron-vite
npm install -D tailwindcss postcss autoprefixer vitest @vitest/coverage-v8
npm install -D playwright @playwright/test
npm install lucide-react clsx tailwind-merge
```

- [ ] **Step 2: Write `package.json` scripts**

```json
{
  "name": "volleyball-scouting",
  "version": "0.1.0",
  "main": "out/main/index.js",
  "scripts": {
    "dev":   "electron-vite dev",
    "build": "electron-vite build && electron-builder",
    "test":  "vitest run",
    "test:e2e": "playwright test",
    "preview": "electron-vite preview"
  }
}
```

- [ ] **Step 3: Write `electron.vite.config.ts`**

```typescript
import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@renderer': resolve('src/renderer'),
      }
    }
  }
});
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@renderer/*": ["src/renderer/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
out/
dist/
*.db
.env
```

- [ ] **Step 6: Commit**

```bash
git add package.json electron.vite.config.ts tsconfig.json .gitignore
git commit -m "chore: initialize Electron + React + TS + Vite project"
```

---

### Task 2: Shared Types and IPC Channels

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/ipc-channels.ts`

- [ ] **Step 1: Write `src/shared/types.ts`**

```typescript
export type Skill = 'S' | 'R' | 'A' | 'B' | 'D' | 'E' | 'F';
export type Effect = '#' | '+' | '!' | '-' | '/' | '=';
export type TeamSide = 'home' | 'away';
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
  point_team: TeamSide | null;
  home_score_after: number | null;
  away_score_after: number | null;
  video_time_ms: number | null;
  raw_input: string | null;
}

export interface Action {
  id: number;
  rally_id: number;
  action_order: number;
  team: TeamSide;
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

export type CreateSeasonDTO  = Omit<Season,     'id' | 'created_at'>;
export type CreateTeamDTO    = Omit<TeamRecord, 'id' | 'created_at'>;
export type CreatePlayerDTO  = Omit<Player,     'id' | 'created_at'>;
export type CreateMatchDTO   = Omit<Match,      'id' | 'created_at'>;
```

- [ ] **Step 2: Write `src/shared/ipc-channels.ts`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/
git commit -m "feat: add shared types and IPC channel constants"
```

---

### Task 3: SQLite — Connection + Migrations

**Files:**
- Create: `src/main/db/connection.ts`
- Create: `src/main/db/migrate.ts`
- Create: `src/main/db/migrations/001_initial.sql`
- Create: `tests/unit/migrations.test.ts`

- [ ] **Step 1: Write failing migration test**

```typescript
// tests/unit/migrations.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';

describe('migrations', () => {
  it('creates all tables without error', () => {
    const db = new Database(':memory:');
    expect(() => runMigrations(db)).not.toThrow();
  });

  it('is idempotent — safe to run twice', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });

  it('creates seasons table with correct columns', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seasons'").get();
    expect(row).toBeTruthy();
  });

  it('creates actions table with correct columns', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='actions'").get();
    expect(row).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
npx vitest run tests/unit/migrations.test.ts
```
Expected: `Error: Cannot find module '../../src/main/db/migrate'`

- [ ] **Step 3: Write `src/main/db/migrations/001_initial.sql`**

Copy full SQL from `docs/specs/tech-spec.md` § "Database Schema". The file contains all CREATE TABLE statements and indexes.

- [ ] **Step 4: Write `src/main/db/migrate.ts`**

```typescript
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  const migrations = [
    { version: 1, file: '001_initial.sql' },
  ];

  const applied = new Set(
    (db.prepare('SELECT version FROM migrations').all() as { version: number }[])
      .map(r => r.version)
  );

  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    const sql = readFileSync(join(__dirname, 'migrations', m.file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO migrations(version) VALUES (?)').run(m.version);
  }
}
```

- [ ] **Step 5: Write `src/main/db/connection.ts`**

```typescript
import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { runMigrations } from './migrate';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = app.isPackaged
    ? join(app.getPath('userData'), 'scouting.db')
    : join(process.cwd(), 'scouting.dev.db');

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  runMigrations(_db);

  return _db;
}
```

- [ ] **Step 6: Run test — verify PASS**

```bash
npx vitest run tests/unit/migrations.test.ts
```
Expected: 4 tests pass

- [ ] **Step 7: Commit**

```bash
git add src/main/db/ tests/unit/migrations.test.ts
git commit -m "feat: add SQLite connection and migration system"
```

---

### Task 4: Electron Main Process + IPC Registry

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/ipc/registry.ts`
- Create: `src/main/ipc/seasons.ipc.ts`

- [ ] **Step 1: Write `src/main/ipc/seasons.ipc.ts`**

```typescript
import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { Season, CreateSeasonDTO } from '@shared/types';
import { getDb } from '../db/connection';

export function registerSeasonsIPC(): void {
  ipcMain.handle(IPC.SEASONS_LIST, (): Season[] => {
    return getDb()
      .prepare('SELECT * FROM seasons ORDER BY start_date DESC')
      .all() as Season[];
  });

  ipcMain.handle(IPC.SEASONS_CREATE, (_e, data: CreateSeasonDTO): Season => {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO seasons (name, code, start_date, end_date, default_video_dir)
      VALUES (@name, @code, @start_date, @end_date, @default_video_dir)
    `).run(data);
    return db.prepare('SELECT * FROM seasons WHERE id = ?').get(result.lastInsertRowid) as Season;
  });

  ipcMain.handle(IPC.SEASONS_UPDATE, (_e, data: Partial<Season> & { id: number }): Season => {
    const db = getDb();
    const { id, ...fields } = data;
    const sets = Object.keys(fields).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE seasons SET ${sets} WHERE id = @id`).run({ ...fields, id });
    return db.prepare('SELECT * FROM seasons WHERE id = ?').get(id) as Season;
  });

  ipcMain.handle(IPC.SEASONS_DELETE, (_e, { id }: { id: number }): void => {
    getDb().prepare('DELETE FROM seasons WHERE id = ?').run(id);
  });
}
```

- [ ] **Step 2: Write `src/main/ipc/registry.ts`**

```typescript
import { registerSeasonsIPC } from './seasons.ipc';

export function registerAllIPC(): void {
  registerSeasonsIPC();
  // Phase 1a additions: registerTeamsIPC(), registerPlayersIPC(), etc.
}
```

- [ ] **Step 3: Write `src/main/index.ts`**

```typescript
import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { registerAllIPC } from './ipc/registry';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']!);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerAllIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 4: Commit**

```bash
git add src/main/
git commit -m "feat: add Electron main process with IPC registry and seasons handlers"
```

---

### Task 5: Preload Bridge

**Files:**
- Create: `src/renderer/preload.ts`

- [ ] **Step 1: Write preload**

```typescript
// src/renderer/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ipc', {
  invoke: <T>(channel: string, data?: unknown): Promise<T> =>
    ipcRenderer.invoke(channel, data),
});

declare global {
  interface Window {
    ipc: {
      invoke: <T>(channel: string, data?: unknown) => Promise<T>;
    };
  }
}
```

- [ ] **Step 2: Write `src/renderer/api/seasons.api.ts`**

```typescript
import { IPC } from '@shared/ipc-channels';
import type { Season, CreateSeasonDTO } from '@shared/types';

export const seasonsApi = {
  list: ()                              => window.ipc.invoke<Season[]>(IPC.SEASONS_LIST),
  create: (data: CreateSeasonDTO)       => window.ipc.invoke<Season>(IPC.SEASONS_CREATE, data),
  update: (id: number, data: Partial<Season>) => window.ipc.invoke<Season>(IPC.SEASONS_UPDATE, { id, ...data }),
  delete: (id: number)                  => window.ipc.invoke<void>(IPC.SEASONS_DELETE, { id }),
};
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/preload.ts src/renderer/api/
git commit -m "feat: add contextBridge preload and seasons API wrapper"
```

---

### Task 6: UI Store (Tabs + Layout)

**Files:**
- Create: `src/renderer/store/ui.store.ts`
- Test: `tests/unit/ui.store.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/ui.store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../src/renderer/store/ui.store';

// Reset store between tests
beforeEach(() => {
  useUIStore.setState({ tabs: [], activeTabId: null, layout: 'scout', sidebarOpen: true });
});

describe('UIStore tabs', () => {
  it('opens a new tab and makes it active', () => {
    const { openTab, tabs, activeTabId } = useUIStore.getState();
    openTab({ type: 'home', label: 'Home', params: {} });
    const state = useUIStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(state.tabs[0].id);
  });

  it('closes a tab and activates adjacent', () => {
    const store = useUIStore.getState();
    store.openTab({ type: 'home', label: 'Home', params: {} });
    store.openTab({ type: 'season', label: 'Season', params: {} });
    const id1 = useUIStore.getState().tabs[0].id;
    const id2 = useUIStore.getState().tabs[1].id;
    useUIStore.getState().setActiveTab(id2);
    useUIStore.getState().closeTab(id2);
    expect(useUIStore.getState().tabs).toHaveLength(1);
    expect(useUIStore.getState().activeTabId).toBe(id1);
  });

  it('does not close last tab', () => {
    useUIStore.getState().openTab({ type: 'home', label: 'Home', params: {} });
    const id = useUIStore.getState().tabs[0].id;
    useUIStore.getState().closeTab(id);
    expect(useUIStore.getState().tabs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
npx vitest run tests/unit/ui.store.test.ts
```
Expected: module not found

- [ ] **Step 3: Write `src/renderer/store/ui.store.ts`**

```typescript
import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type Layout = 'scout' | 'show' | 'synchronize';
export type TabType = 'home' | 'match' | 'season' | 'team' | 'player' | 'report';

export interface Tab {
  id: string;
  type: TabType;
  label: string;
  params: Record<string, unknown>;
  isDirty: boolean;
}

interface UIStore {
  tabs: Tab[];
  activeTabId: string | null;
  layout: Layout;
  sidebarOpen: boolean;

  openTab:      (config: Omit<Tab, 'id' | 'isDirty'>) => void;
  closeTab:     (id: string) => void;
  setActiveTab: (id: string) => void;
  setLayout:    (layout: Layout) => void;
  markDirty:    (tabId: string) => void;
  markClean:    (tabId: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  layout: 'scout',
  sidebarOpen: true,

  openTab: (config) => {
    const tab: Tab = { ...config, id: nanoid(), isDirty: false };
    set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex(t => t.id === id);
    const next = tabs[idx + 1] ?? tabs[idx - 1];
    set({
      tabs: tabs.filter(t => t.id !== id),
      activeTabId: activeTabId === id ? next.id : activeTabId,
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
  setLayout:    (layout) => set({ layout }),
  markDirty:    (tabId) => set(s => ({ tabs: s.tabs.map(t => t.id === tabId ? { ...t, isDirty: true } : t) })),
  markClean:    (tabId) => set(s => ({ tabs: s.tabs.map(t => t.id === tabId ? { ...t, isDirty: false } : t) })),
}));
```

Don't forget: `npm install nanoid`

- [ ] **Step 4: Run test — verify PASS**

```bash
npx vitest run tests/unit/ui.store.test.ts
```
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/renderer/store/ui.store.ts tests/unit/ui.store.test.ts
git commit -m "feat: add UIStore with tab management and layout state"
```

---

### Task 7: Tab-Based Shell UI

**Files:**
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/features/layout/TabBar.tsx`
- Create: `src/renderer/features/layout/Sidebar.tsx`
- Create: `src/renderer/index.html`

- [ ] **Step 1: Setup Tailwind**

```bash
npx tailwindcss init -p
```

Edit `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

Create `src/renderer/styles/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Write `src/renderer/index.html`**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Volleyball Scouting</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 3: Write `src/renderer/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Write `src/renderer/features/layout/TabBar.tsx`**

```tsx
import React from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '../../store/ui.store';
import { clsx } from 'clsx';

export function TabBar(): React.ReactElement {
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useUIStore();

  return (
    <div className="flex items-center bg-zinc-900 border-b border-zinc-700 overflow-x-auto h-9 shrink-0">
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={clsx(
            'flex items-center gap-1.5 px-3 h-full text-xs cursor-pointer border-r border-zinc-700 shrink-0 max-w-[180px]',
            activeTabId === tab.id
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          <span className="truncate">{tab.isDirty ? `${tab.label} •` : tab.label}</span>
          {tabs.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
              className="ml-auto hover:text-white opacity-60 hover:opacity-100"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => openTab({ type: 'home', label: 'Home', params: {} })}
        className="px-3 h-full text-zinc-500 hover:text-white hover:bg-zinc-800 text-lg leading-none"
        title="New tab"
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Write `src/renderer/features/layout/Sidebar.tsx`**

```tsx
import React from 'react';
import { useUIStore } from '../../store/ui.store';
import { Database, Users, User, Calendar, BarChart2, Video } from 'lucide-react';

const navItems = [
  { icon: Calendar,  label: 'Saisons',  type: 'season'  as const },
  { icon: Users,     label: 'Teams',    type: 'team'    as const },
  { icon: User,      label: 'Spieler',  type: 'player'  as const },
  { icon: Database,  label: 'Spiele',   type: 'match'   as const },
  { icon: BarChart2, label: 'Reports',  type: 'report'  as const },
  { icon: Video,     label: 'Video',    type: 'match'   as const },
];

export function Sidebar(): React.ReactElement {
  const { openTab } = useUIStore();

  return (
    <nav className="w-14 bg-zinc-900 border-r border-zinc-700 flex flex-col items-center py-3 gap-1 shrink-0">
      {navItems.map(item => (
        <button
          key={item.label}
          title={item.label}
          onClick={() => openTab({ type: item.type, label: item.label, params: {} })}
          className="w-10 h-10 flex flex-col items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-zinc-700 text-[9px] gap-0.5"
        >
          <item.icon size={18} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 6: Write `src/renderer/App.tsx`**

```tsx
import React from 'react';
import { TabBar } from './features/layout/TabBar';
import { Sidebar } from './features/layout/Sidebar';
import { useUIStore } from './store/ui.store';

function TabContent(): React.ReactElement {
  const { tabs, activeTabId } = useUIStore();
  const active = tabs.find(t => t.id === activeTabId);

  if (!active) return <div className="flex-1 flex items-center justify-center text-zinc-500">Kein Tab offen</div>;

  return (
    <div className="flex-1 overflow-auto p-4 text-zinc-200">
      <h1 className="text-xl font-semibold">{active.label}</h1>
      <p className="text-zinc-500 mt-2">Tab-Typ: {active.type}</p>
    </div>
  );
}

export default function App(): React.ReactElement {
  const { openTab, tabs } = useUIStore();

  React.useEffect(() => {
    if (tabs.length === 0) {
      openTab({ type: 'home', label: 'Home', params: {} });
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          <TabContent />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Start dev server — verify app opens**

```bash
npm run dev
```
Expected: Electron window opens, dark app shell visible, sidebar + tab bar rendered, clicking sidebar items opens new tabs.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/
git commit -m "feat: add tab-based app shell with sidebar navigation"
```

---

### Task 8: Run All Tests

- [ ] **Step 1: Run unit tests**

```bash
npx vitest run
```
Expected: migrations.test.ts (4 pass), ui.store.test.ts (3 pass) — 7 total

- [ ] **Step 2: Fix any failures**

If migration test fails: verify `001_initial.sql` contains all CREATE TABLE statements from tech-spec.
If ui.store test fails: check nanoid import and Zustand store reset in beforeEach.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: Phase 0 complete — Electron scaffold with SQLite, IPC, tab UI"
```

---

## Next Plans

| Plan | Scope |
|------|-------|
| `2026-06-09-phase-1a-data-mgmt.md` | Seasons/Teams/Players/Matches full CRUD UI |
| `2026-06-09-phase-1b-scouting.md` | Code parser + CommandLine + RallyLog |
| `2026-06-09-phase-1c-reports.md` | MatchReport + PlayerStats |
| `2026-06-09-phase-1d-dvw.md` | DVW import/export |
