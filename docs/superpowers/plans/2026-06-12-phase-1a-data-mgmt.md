# Phase 1a: Datenverwaltung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD für Seasons, Teams, Players, Roster und Matches — anklickbar in der Tab-UI, persistent in SQLite, mit sauberer Validierung und einem gestylten UI-Primitiven-Set.

**Architecture:** Neue Entitäten nutzen einen **Repo-Seam**: reine Funktionen in `src/main/db/<entity>.repo.ts` arbeiten auf einer `better-sqlite3`-Instanz und enthalten alle Validierung. Dünne IPC-Handler in `src/main/ipc/<entity>.ipc.ts` rufen die Repos mit `getDb()`. Renderer ruft über `api/*.api.ts` → Zustand-Store → React-Screen. Repos sind mit In-Memory-SQLite unit-testbar (TDD wie der bestehende Migrations-Test). UI baut auf einem neuen Set gestylter Tailwind-Primitiven (`components/ui/*`), kein nacktes HTML-Control.

**Tech Stack:** Electron, better-sqlite3, React 19, Zustand, Tailwind v4, lucide-react, clsx + tailwind-merge, Vitest.

**Scope-Notes (bewusst ausgeklammert in 1a):** `season_teams`-Verknüpfungs-UI (Teams werden global gelistet), Team/Player-Merge, Drag&Drop-Roster, DVW, Video-Felder. Diese Felder bleiben im Schema, werden aber hier nicht bedient.

---

## File Map

| Datei | Verantwortung |
|------|------|
| `src/renderer/lib/cn.ts` | `cn()` class-merge helper |
| `src/renderer/components/ui/Button.tsx` | `Button`, `IconButton` |
| `src/renderer/components/ui/Field.tsx` | `Field`, `Input`, `Textarea`, `Select` |
| `src/renderer/components/ui/Dialog.tsx` | Modal-Dialog |
| `src/renderer/components/ui/DataTable.tsx` | Generische Tabelle |
| `src/renderer/components/ui/EmptyState.tsx` | Leerzustand |
| `src/renderer/components/ui/Page.tsx` | Screen-Header-Wrapper |
| `src/main/db/errors.ts` | `mapDbError()` SQLite→freundlich |
| `src/main/ipc/handle.ts` | `handle()` IPC-Wrapper mit Error-Cleanup |
| `src/shared/types.ts` | + `MatchRow`, `MatchDetail`, `RosterEntryInput` |
| `src/shared/ipc-channels.ts` | + `ROSTER_UPDATE` |
| `src/main/db/teams.repo.ts` + `src/main/ipc/teams.ipc.ts` + `src/renderer/api/teams.api.ts` + `src/renderer/store/teams.store.ts` | Teams full-stack |
| `src/main/db/players.repo.ts` + `players.ipc.ts` + `players.api.ts` + `players.store.ts` | Players full-stack |
| `src/main/db/roster.repo.ts` + `roster.ipc.ts` + `roster.api.ts` + `roster.store.ts` | Roster full-stack |
| `src/main/db/matches.repo.ts` + `matches.ipc.ts` + `matches.api.ts` + `matches.store.ts` | Matches full-stack |
| `src/renderer/store/seasons.store.ts` | Seasons-Store (Backend existiert) |
| `src/renderer/features/{seasons,teams,players,matches}/*` | List + Form Screens, TeamRoster |
| `src/renderer/features/home/HomeScreen.tsx` | Start-Dashboard |
| `src/renderer/features/layout/TabContent.tsx` | Tab-Typ → Screen Router |
| `tests/unit/{teams,players,roster,matches}.repo.test.ts` | Repo-Tests |

---

## Task 1: UI-Primitiven-Fundament

**Files:**
- Create: `src/renderer/lib/cn.ts`
- Create: `src/renderer/components/ui/Button.tsx`
- Create: `src/renderer/components/ui/Field.tsx`
- Create: `src/renderer/components/ui/Dialog.tsx`
- Create: `src/renderer/components/ui/DataTable.tsx`
- Create: `src/renderer/components/ui/EmptyState.tsx`
- Create: `src/renderer/components/ui/Page.tsx`

- [ ] **Step 1: Write `src/renderer/lib/cn.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Write `src/renderer/components/ui/Button.tsx`**

```tsx
import React from 'react';
import { cn } from '@renderer/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ' +
  'disabled:opacity-40 disabled:pointer-events-none select-none';

const variants: Record<Variant, string> = {
  primary:   'bg-sky-600 text-white hover:bg-sky-500 active:bg-sky-700',
  secondary: 'bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 active:bg-zinc-600',
  ghost:     'text-zinc-300 hover:bg-zinc-800 hover:text-white',
  danger:    'bg-red-600/90 text-white hover:bg-red-500 active:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function IconButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors',
        'hover:bg-zinc-800 hover:text-white disabled:opacity-40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Write `src/renderer/components/ui/Field.tsx`**

```tsx
import React from 'react';
import { cn } from '@renderer/lib/cn';

const controlBase =
  'w-full h-9 rounded-lg bg-zinc-900 border border-zinc-700 px-3 text-sm text-zinc-100 ' +
  'placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 ' +
  'focus:ring-sky-500/60 disabled:opacity-40';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, className)} {...props} />;
  },
);

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, 'h-auto min-h-[72px] resize-y py-2', className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, 'appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, required, error, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-400">
        {label}
        {required && <span className="text-sky-400"> *</span>}
      </span>
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}
```

- [ ] **Step 4: Write `src/renderer/components/ui/Dialog.tsx`**

```tsx
import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@renderer/lib/cn';
import { IconButton } from './Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, footer, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={cn('w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl', className)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <IconButton onClick={onClose} aria-label="Schließen">
            <X size={16} />
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write `src/renderer/components/ui/DataTable.tsx`**

```tsx
import React from 'react';
import { cn } from '@renderer/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick }: DataTableProps<T>) {
  return (
    <div className="overflow-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn('px-3 py-2.5 text-left text-xs font-medium text-zinc-400', c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-zinc-800/60 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-zinc-800/40',
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-2.5 text-zinc-200', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/renderer/components/ui/EmptyState.tsx`**

```tsx
import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
      {icon && <div className="mb-3 text-zinc-600">{icon}</div>}
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Write `src/renderer/components/ui/Page.tsx`**

```tsx
import React from 'react';

export interface PageProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function Page({ title, actions, children }: PageProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-100">{title}</h1>
        <div className="flex items-center gap-2">{actions}</div>
      </header>
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/renderer/lib/cn.ts src/renderer/components/ui/
git commit -m "feat(ui): add styled primitive component set"
```

---

## Task 2: DB-Error-Mapping + IPC-Wrapper

**Files:**
- Create: `src/main/db/errors.ts`
- Create: `src/main/ipc/handle.ts`

- [ ] **Step 1: Write `src/main/db/errors.ts`**

```typescript
export interface DbErrorContext {
  entity: string;
  field?: string;
}

/** Übersetzt better-sqlite3 Constraint-Fehler in benutzerfreundliche Meldungen. */
export function mapDbError(e: unknown, ctx: DbErrorContext): never {
  const code = (e as { code?: string }).code;
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new Error(`${ctx.entity}: „${ctx.field ?? 'Wert'}" existiert bereits.`);
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    throw new Error(`${ctx.entity}: wird noch verwendet und kann nicht gelöscht werden.`);
  }
  throw e instanceof Error ? e : new Error(String(e));
}
```

- [ ] **Step 2: Write `src/main/ipc/handle.ts`**

```typescript
import { ipcMain, type IpcMainInvokeEvent } from 'electron';

type Handler = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;

/** Registriert einen IPC-Handler und reicht nur eine saubere Error-Message an den Renderer durch. */
export function handle(channel: string, fn: Handler): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await fn(event, ...args);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e));
    }
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/db/errors.ts src/main/ipc/handle.ts
git commit -m "feat(main): add SQLite error mapping and IPC handle wrapper"
```

---

## Task 3: Shared Types + Channel-Ergänzungen

**Files:**
- Modify: `src/shared/types.ts` (append)
- Modify: `src/shared/ipc-channels.ts:21` (Roster-Block)

- [ ] **Step 1: Append to `src/shared/types.ts`**

Am Dateiende anfügen:

```typescript
export interface MatchRow extends Match {
  home_team_name: string;
  away_team_name: string;
}

export interface MatchDetail extends Match {
  home_team: TeamRecord;
  away_team: TeamRecord;
}

export interface RosterEntryInput {
  team_id: number;
  player_id: number;
  shirt_number: number;
  is_libero: boolean;
  is_setter: boolean;
}
```

- [ ] **Step 2: Add `ROSTER_UPDATE` channel in `src/shared/ipc-channels.ts`**

Ersetze den Roster-Block:

```typescript
  ROSTER_GET:           'roster:get',
  ROSTER_ADD_PLAYER:    'roster:add-player',
  ROSTER_REMOVE_PLAYER: 'roster:remove-player',
```

durch:

```typescript
  ROSTER_GET:           'roster:get',
  ROSTER_ADD_PLAYER:    'roster:add-player',
  ROSTER_UPDATE:        'roster:update',
  ROSTER_REMOVE_PLAYER: 'roster:remove-player',
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts src/shared/ipc-channels.ts
git commit -m "feat(shared): add match/roster types and roster:update channel"
```

---

## Task 4: Teams Repo (TDD)

**Files:**
- Create: `tests/unit/teams.repo.test.ts`
- Create: `src/main/db/teams.repo.ts`

- [ ] **Step 1: Write failing test `tests/unit/teams.repo.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createTeam, listTeams, updateTeam, deleteTeam } from '../../src/main/db/teams.repo';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

describe('teams.repo', () => {
  it('creates and lists a team', () => {
    const db = freshDb();
    const t = createTeam(db, { name: 'VC Beispiel', code: 'VCB', coach: null });
    expect(t.id).toBeGreaterThan(0);
    expect(listTeams(db)).toHaveLength(1);
  });

  it('rejects duplicate code with friendly message', () => {
    const db = freshDb();
    createTeam(db, { name: 'A', code: 'VCB', coach: null });
    expect(() => createTeam(db, { name: 'B', code: 'VCB', coach: null })).toThrowError(/existiert bereits/);
  });

  it('updates a team', () => {
    const db = freshDb();
    const t = createTeam(db, { name: 'A', code: 'AAA', coach: null });
    const u = updateTeam(db, t.id, { coach: 'Trainer X' });
    expect(u.coach).toBe('Trainer X');
  });

  it('blocks delete when referenced by a match', () => {
    const db = freshDb();
    const home = createTeam(db, { name: 'H', code: 'HHH', coach: null });
    const away = createTeam(db, { name: 'V', code: 'VVV', coach: null });
    db.prepare('INSERT INTO matches (home_team_id, away_team_id) VALUES (?, ?)').run(home.id, away.id);
    expect(() => deleteTeam(db, home.id)).toThrowError(/verwendet/);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/unit/teams.repo.test.ts`
Expected: FAIL — `Cannot find module '../../src/main/db/teams.repo'`

- [ ] **Step 3: Write `src/main/db/teams.repo.ts`**

```typescript
import type Database from 'better-sqlite3';
import type { TeamRecord, CreateTeamDTO } from '@shared/types';
import { mapDbError } from './errors';

export function getTeam(db: Database.Database, id: number): TeamRecord {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as TeamRecord;
}

export function listTeams(db: Database.Database, seasonId?: number): TeamRecord[] {
  if (seasonId != null) {
    return db
      .prepare(
        `SELECT t.* FROM teams t
         JOIN season_teams st ON st.team_id = t.id
         WHERE st.season_id = ?
         ORDER BY t.name`,
      )
      .all(seasonId) as TeamRecord[];
  }
  return db.prepare('SELECT * FROM teams ORDER BY name').all() as TeamRecord[];
}

export function createTeam(db: Database.Database, dto: CreateTeamDTO): TeamRecord {
  try {
    const r = db
      .prepare('INSERT INTO teams (name, code, coach) VALUES (@name, @code, @coach)')
      .run({ coach: null, ...dto });
    return getTeam(db, Number(r.lastInsertRowid));
  } catch (e) {
    return mapDbError(e, { entity: 'Team', field: 'Code' });
  }
}

export function updateTeam(
  db: Database.Database,
  id: number,
  fields: Partial<Omit<TeamRecord, 'id' | 'created_at'>>,
): TeamRecord {
  const keys = Object.keys(fields);
  if (keys.length === 0) return getTeam(db, id);
  const sets = keys.map((k) => `${k} = @${k}`).join(', ');
  try {
    db.prepare(`UPDATE teams SET ${sets} WHERE id = @id`).run({ ...fields, id });
    return getTeam(db, id);
  } catch (e) {
    return mapDbError(e, { entity: 'Team', field: 'Code' });
  }
}

export function deleteTeam(db: Database.Database, id: number): void {
  try {
    db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  } catch (e) {
    mapDbError(e, { entity: 'Team' });
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/unit/teams.repo.test.ts`
Expected: 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add tests/unit/teams.repo.test.ts src/main/db/teams.repo.ts
git commit -m "feat(teams): add teams repo with validation (TDD)"
```

---

## Task 5: Teams IPC + API + Store

**Files:**
- Create: `src/main/ipc/teams.ipc.ts`
- Modify: `src/main/ipc/registry.ts`
- Create: `src/renderer/api/teams.api.ts`
- Create: `src/renderer/store/teams.store.ts`

- [ ] **Step 1: Write `src/main/ipc/teams.ipc.ts`**

```typescript
import type { CreateTeamDTO, TeamRecord } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/teams.repo';

export function registerTeamsIPC(): void {
  handle(IPC.TEAMS_LIST, (_e, { season_id }: { season_id?: number } = {}) =>
    repo.listTeams(getDb(), season_id),
  );
  handle(IPC.TEAMS_CREATE, (_e, dto: CreateTeamDTO) => repo.createTeam(getDb(), dto));
  handle(IPC.TEAMS_UPDATE, (_e, { id, ...fields }: Partial<TeamRecord> & { id: number }) =>
    repo.updateTeam(getDb(), id, fields),
  );
  handle(IPC.TEAMS_DELETE, (_e, { id }: { id: number }) => repo.deleteTeam(getDb(), id));
}
```

- [ ] **Step 2: Register in `src/main/ipc/registry.ts`**

Ersetze den Inhalt:

```typescript
import { registerSeasonsIPC } from './seasons.ipc';
import { registerTeamsIPC } from './teams.ipc';

export function registerAllIPC(): void {
  registerSeasonsIPC();
  registerTeamsIPC();
}
```

- [ ] **Step 3: Write `src/renderer/api/teams.api.ts`**

```typescript
import { IPC } from '@shared/ipc-channels';
import type { TeamRecord, CreateTeamDTO } from '@shared/types';

export const teamsApi = {
  list: (seasonId?: number) =>
    window.ipc.invoke<TeamRecord[]>(IPC.TEAMS_LIST, { season_id: seasonId }),
  create: (data: CreateTeamDTO) => window.ipc.invoke<TeamRecord>(IPC.TEAMS_CREATE, data),
  update: (id: number, data: Partial<TeamRecord>) =>
    window.ipc.invoke<TeamRecord>(IPC.TEAMS_UPDATE, { id, ...data }),
  delete: (id: number) => window.ipc.invoke<void>(IPC.TEAMS_DELETE, { id }),
};
```

- [ ] **Step 4: Write `src/renderer/store/teams.store.ts`**

```typescript
import { create } from 'zustand';
import type { TeamRecord, CreateTeamDTO } from '@shared/types';
import { teamsApi } from '@renderer/api/teams.api';

interface TeamsStore {
  teams: TeamRecord[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (data: CreateTeamDTO) => Promise<void>;
  update: (id: number, data: Partial<TeamRecord>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useTeamsStore = create<TeamsStore>((set, get) => ({
  teams: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ teams: await teamsApi.list(), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (data) => {
    await teamsApi.create(data);
    await get().load();
  },
  update: async (id, data) => {
    await teamsApi.update(id, data);
    await get().load();
  },
  remove: async (id) => {
    await teamsApi.delete(id);
    await get().load();
  },
}));
```

- [ ] **Step 5: Run full unit tests (regression)**

Run: `npx vitest run`
Expected: alle bisherigen Tests grün (inkl. teams.repo)

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc/teams.ipc.ts src/main/ipc/registry.ts src/renderer/api/teams.api.ts src/renderer/store/teams.store.ts
git commit -m "feat(teams): wire IPC handler, api wrapper and store"
```

---

## Task 6: Seasons Store + Teams/Seasons Screens

**Files:**
- Create: `src/renderer/store/seasons.store.ts`
- Create: `src/renderer/features/seasons/SeasonForm.tsx`
- Create: `src/renderer/features/seasons/SeasonList.tsx`
- Create: `src/renderer/features/teams/TeamForm.tsx`
- Create: `src/renderer/features/teams/TeamList.tsx`

- [ ] **Step 1: Write `src/renderer/store/seasons.store.ts`**

```typescript
import { create } from 'zustand';
import type { Season, CreateSeasonDTO } from '@shared/types';
import { seasonsApi } from '@renderer/api/seasons.api';

interface SeasonsStore {
  seasons: Season[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (data: CreateSeasonDTO) => Promise<void>;
  update: (id: number, data: Partial<Season>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useSeasonsStore = create<SeasonsStore>((set, get) => ({
  seasons: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ seasons: await seasonsApi.list(), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (data) => {
    await seasonsApi.create(data);
    await get().load();
  },
  update: async (id, data) => {
    await seasonsApi.update(id, data);
    await get().load();
  },
  remove: async (id) => {
    await seasonsApi.delete(id);
    await get().load();
  },
}));
```

- [ ] **Step 2: Write `src/renderer/features/seasons/SeasonForm.tsx`**

```tsx
import React from 'react';
import type { Season, CreateSeasonDTO } from '@shared/types';
import { Field, Input } from '@renderer/components/ui/Field';

export interface SeasonFormValues extends CreateSeasonDTO {}

export function emptySeason(): SeasonFormValues {
  return { name: '', code: '', start_date: null, end_date: null, default_video_dir: null };
}

export function seasonToForm(s: Season): SeasonFormValues {
  return {
    name: s.name,
    code: s.code,
    start_date: s.start_date,
    end_date: s.end_date,
    default_video_dir: s.default_video_dir,
  };
}

export function SeasonForm({
  values,
  onChange,
}: {
  values: SeasonFormValues;
  onChange: (v: SeasonFormValues) => void;
}) {
  const set = (patch: Partial<SeasonFormValues>) => onChange({ ...values, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Name" required>
        <Input value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="Saison 2024/25" />
      </Field>
      <Field label="Code" required>
        <Input value={values.code} onChange={(e) => set({ code: e.target.value })} placeholder="2024-25" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input type="date" value={values.start_date ?? ''} onChange={(e) => set({ start_date: e.target.value || null })} />
        </Field>
        <Field label="Ende">
          <Input type="date" value={values.end_date ?? ''} onChange={(e) => set({ end_date: e.target.value || null })} />
        </Field>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/renderer/features/seasons/SeasonList.tsx`**

```tsx
import React from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import type { Season } from '@shared/types';
import { useSeasonsStore } from '@renderer/store/seasons.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { SeasonForm, emptySeason, seasonToForm, type SeasonFormValues } from './SeasonForm';

export function SeasonList() {
  const { seasons, load, create, update, remove, error } = useSeasonsStore();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<SeasonFormValues>(emptySeason());

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptySeason());
    setOpen(true);
  };
  const openEdit = (s: Season) => {
    setEditId(s.id);
    setForm(seasonToForm(s));
    setOpen(true);
  };
  const save = async () => {
    if (editId == null) await create(form);
    else await update(editId, form);
    setOpen(false);
  };

  return (
    <Page
      title="Saisons"
      actions={
        <Button onClick={openCreate}>
          <Plus size={16} /> Neue Saison
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {seasons.length === 0 ? (
        <EmptyState
          icon={<Calendar size={32} />}
          title="Noch keine Saison"
          description="Lege eine Saison an, um Teams und Spiele zuzuordnen."
          actionLabel="Neue Saison"
          onAction={openCreate}
        />
      ) : (
        <DataTable<Season>
          rows={seasons}
          rowKey={(s) => s.id}
          onRowClick={openEdit}
          columns={[
            { key: 'name', header: 'Name', render: (s) => <span className="font-medium">{s.name}</span> },
            { key: 'code', header: 'Code', render: (s) => s.code },
            { key: 'start', header: 'Start', render: (s) => s.start_date ?? '—' },
            { key: 'end', header: 'Ende', render: (s) => s.end_date ?? '—' },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              render: (s) => (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Saison „${s.name}" löschen?`)) remove(s.id);
                  }}
                  aria-label="Löschen"
                >
                  <Trash2 size={15} />
                </IconButton>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editId == null ? 'Neue Saison' : 'Saison bearbeiten'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={save} disabled={!form.name || !form.code}>
              Speichern
            </Button>
          </>
        }
      >
        <SeasonForm values={form} onChange={setForm} />
      </Dialog>
    </Page>
  );
}
```

- [ ] **Step 4: Write `src/renderer/features/teams/TeamForm.tsx`**

```tsx
import React from 'react';
import type { TeamRecord, CreateTeamDTO } from '@shared/types';
import { Field, Input } from '@renderer/components/ui/Field';

export interface TeamFormValues extends CreateTeamDTO {}

export function emptyTeam(): TeamFormValues {
  return { name: '', code: '', coach: null };
}

export function teamToForm(t: TeamRecord): TeamFormValues {
  return { name: t.name, code: t.code, coach: t.coach };
}

export function TeamForm({
  values,
  onChange,
}: {
  values: TeamFormValues;
  onChange: (v: TeamFormValues) => void;
}) {
  const set = (patch: Partial<TeamFormValues>) => onChange({ ...values, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Name" required>
        <Input value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="VC Beispielstadt" />
      </Field>
      <Field label="Code" required>
        <Input
          value={values.code}
          maxLength={3}
          onChange={(e) => set({ code: e.target.value.toUpperCase() })}
          placeholder="VCB"
        />
      </Field>
      <Field label="Trainer">
        <Input value={values.coach ?? ''} onChange={(e) => set({ coach: e.target.value || null })} />
      </Field>
    </div>
  );
}
```

- [ ] **Step 5: Write `src/renderer/features/teams/TeamList.tsx`**

```tsx
import React from 'react';
import { Users, Plus, Trash2, ListChecks } from 'lucide-react';
import type { TeamRecord } from '@shared/types';
import { useTeamsStore } from '@renderer/store/teams.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { TeamForm, emptyTeam, teamToForm, type TeamFormValues } from './TeamForm';
import { TeamRoster } from './TeamRoster';

export function TeamList() {
  const { teams, load, create, update, remove, error } = useTeamsStore();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<TeamFormValues>(emptyTeam());
  const [rosterTeam, setRosterTeam] = React.useState<TeamRecord | null>(null);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyTeam());
    setOpen(true);
  };
  const openEdit = (t: TeamRecord) => {
    setEditId(t.id);
    setForm(teamToForm(t));
    setOpen(true);
  };
  const save = async () => {
    if (editId == null) await create(form);
    else await update(editId, form);
    setOpen(false);
  };

  return (
    <Page
      title="Teams"
      actions={
        <Button onClick={openCreate}>
          <Plus size={16} /> Neues Team
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {teams.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="Noch keine Teams"
          description="Lege ein Team an und stelle anschließend den Kader auf."
          actionLabel="Neues Team"
          onAction={openCreate}
        />
      ) : (
        <DataTable<TeamRecord>
          rows={teams}
          rowKey={(t) => t.id}
          onRowClick={openEdit}
          columns={[
            { key: 'name', header: 'Name', render: (t) => <span className="font-medium">{t.name}</span> },
            { key: 'code', header: 'Code', render: (t) => t.code },
            { key: 'coach', header: 'Trainer', render: (t) => t.coach ?? '—' },
            {
              key: 'actions',
              header: '',
              className: 'w-24 text-right',
              render: (t) => (
                <div className="flex justify-end gap-1">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setRosterTeam(t);
                    }}
                    aria-label="Kader"
                  >
                    <ListChecks size={15} />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Team „${t.name}" löschen?`)) remove(t.id);
                    }}
                    aria-label="Löschen"
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editId == null ? 'Neues Team' : 'Team bearbeiten'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={save} disabled={!form.name || !form.code}>
              Speichern
            </Button>
          </>
        }
      >
        <TeamForm values={form} onChange={setForm} />
      </Dialog>
      {rosterTeam && <TeamRoster team={rosterTeam} onClose={() => setRosterTeam(null)} />}
    </Page>
  );
}
```

> `TeamRoster` wird in Task 9 erstellt. Dieser Import bleibt bis dahin rot — das ist erwartet; die Datei kompiliert erst nach Task 9. Reihenfolge einhalten.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/store/seasons.store.ts src/renderer/features/seasons/ src/renderer/features/teams/TeamForm.tsx src/renderer/features/teams/TeamList.tsx
git commit -m "feat(ui): add seasons and teams list/form screens"
```

---

## Task 7: Players Repo (TDD)

**Files:**
- Create: `tests/unit/players.repo.test.ts`
- Create: `src/main/db/players.repo.ts`

- [ ] **Step 1: Write failing test `tests/unit/players.repo.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createPlayer, listPlayers, updatePlayer } from '../../src/main/db/players.repo';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

const base = {
  code: 'SMI-JOH',
  first_name: 'John',
  last_name: 'Smith',
  position: 'OH' as const,
  height_cm: 190,
  weight_kg: 82,
  reach_cm: 340,
  photo_path: null,
};

describe('players.repo', () => {
  it('creates and lists a player', () => {
    const db = freshDb();
    const p = createPlayer(db, base);
    expect(p.id).toBeGreaterThan(0);
    expect(listPlayers(db)).toHaveLength(1);
  });

  it('rejects duplicate code', () => {
    const db = freshDb();
    createPlayer(db, base);
    expect(() => createPlayer(db, { ...base, first_name: 'Jane' })).toThrowError(/existiert bereits/);
  });

  it('rejects invalid position', () => {
    const db = freshDb();
    expect(() => createPlayer(db, { ...base, position: 'ZZ' as never })).toThrowError(/Position/);
  });

  it('updates a player', () => {
    const db = freshDb();
    const p = createPlayer(db, base);
    const u = updatePlayer(db, p.id, { height_cm: 195 });
    expect(u.height_cm).toBe(195);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/unit/players.repo.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `src/main/db/players.repo.ts`**

```typescript
import type Database from 'better-sqlite3';
import type { Player, CreatePlayerDTO, Position } from '@shared/types';
import { mapDbError } from './errors';

const POSITIONS: Position[] = ['OH', 'MB', 'OPP', 'S', 'L', 'DS'];

function assertPosition(pos: Position | null): void {
  if (pos != null && !POSITIONS.includes(pos)) {
    throw new Error('Spieler: ungültige Position.');
  }
}

export function getPlayer(db: Database.Database, id: number): Player {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id) as Player;
}

export function listPlayers(db: Database.Database): Player[] {
  return db.prepare('SELECT * FROM players ORDER BY last_name, first_name').all() as Player[];
}

export function createPlayer(db: Database.Database, dto: CreatePlayerDTO): Player {
  assertPosition(dto.position);
  try {
    const r = db
      .prepare(
        `INSERT INTO players (code, first_name, last_name, position, height_cm, weight_kg, reach_cm, photo_path)
         VALUES (@code, @first_name, @last_name, @position, @height_cm, @weight_kg, @reach_cm, @photo_path)`,
      )
      .run({ position: null, height_cm: null, weight_kg: null, reach_cm: null, photo_path: null, ...dto });
    return getPlayer(db, Number(r.lastInsertRowid));
  } catch (e) {
    return mapDbError(e, { entity: 'Spieler', field: 'Code' });
  }
}

export function updatePlayer(
  db: Database.Database,
  id: number,
  fields: Partial<Omit<Player, 'id' | 'created_at'>>,
): Player {
  if (fields.position !== undefined) assertPosition(fields.position);
  const keys = Object.keys(fields);
  if (keys.length === 0) return getPlayer(db, id);
  const sets = keys.map((k) => `${k} = @${k}`).join(', ');
  try {
    db.prepare(`UPDATE players SET ${sets} WHERE id = @id`).run({ ...fields, id });
    return getPlayer(db, id);
  } catch (e) {
    return mapDbError(e, { entity: 'Spieler', field: 'Code' });
  }
}

export function deletePlayer(db: Database.Database, id: number): void {
  try {
    db.prepare('DELETE FROM players WHERE id = ?').run(id);
  } catch (e) {
    mapDbError(e, { entity: 'Spieler' });
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/unit/players.repo.test.ts`
Expected: 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add tests/unit/players.repo.test.ts src/main/db/players.repo.ts
git commit -m "feat(players): add players repo with validation (TDD)"
```

---

## Task 8: Players IPC + API + Store + Screen

**Files:**
- Create: `src/main/ipc/players.ipc.ts`
- Modify: `src/main/ipc/registry.ts`
- Create: `src/renderer/api/players.api.ts`
- Create: `src/renderer/store/players.store.ts`
- Create: `src/renderer/features/players/PlayerForm.tsx`
- Create: `src/renderer/features/players/PlayerList.tsx`

- [ ] **Step 1: Write `src/main/ipc/players.ipc.ts`**

```typescript
import type { CreatePlayerDTO, Player } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/players.repo';

export function registerPlayersIPC(): void {
  handle(IPC.PLAYERS_LIST, () => repo.listPlayers(getDb()));
  handle(IPC.PLAYERS_CREATE, (_e, dto: CreatePlayerDTO) => repo.createPlayer(getDb(), dto));
  handle(IPC.PLAYERS_UPDATE, (_e, { id, ...fields }: Partial<Player> & { id: number }) =>
    repo.updatePlayer(getDb(), id, fields),
  );
  handle(IPC.PLAYERS_DELETE, (_e, { id }: { id: number }) => repo.deletePlayer(getDb(), id));
}
```

- [ ] **Step 2: Register in `src/main/ipc/registry.ts`**

```typescript
import { registerSeasonsIPC } from './seasons.ipc';
import { registerTeamsIPC } from './teams.ipc';
import { registerPlayersIPC } from './players.ipc';

export function registerAllIPC(): void {
  registerSeasonsIPC();
  registerTeamsIPC();
  registerPlayersIPC();
}
```

- [ ] **Step 3: Write `src/renderer/api/players.api.ts`**

```typescript
import { IPC } from '@shared/ipc-channels';
import type { Player, CreatePlayerDTO } from '@shared/types';

export const playersApi = {
  list: () => window.ipc.invoke<Player[]>(IPC.PLAYERS_LIST),
  create: (data: CreatePlayerDTO) => window.ipc.invoke<Player>(IPC.PLAYERS_CREATE, data),
  update: (id: number, data: Partial<Player>) =>
    window.ipc.invoke<Player>(IPC.PLAYERS_UPDATE, { id, ...data }),
  delete: (id: number) => window.ipc.invoke<void>(IPC.PLAYERS_DELETE, { id }),
};
```

- [ ] **Step 4: Write `src/renderer/store/players.store.ts`**

```typescript
import { create } from 'zustand';
import type { Player, CreatePlayerDTO } from '@shared/types';
import { playersApi } from '@renderer/api/players.api';

interface PlayersStore {
  players: Player[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (data: CreatePlayerDTO) => Promise<void>;
  update: (id: number, data: Partial<Player>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const usePlayersStore = create<PlayersStore>((set, get) => ({
  players: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ players: await playersApi.list(), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (data) => {
    await playersApi.create(data);
    await get().load();
  },
  update: async (id, data) => {
    await playersApi.update(id, data);
    await get().load();
  },
  remove: async (id) => {
    await playersApi.delete(id);
    await get().load();
  },
}));
```

- [ ] **Step 5: Write `src/renderer/features/players/PlayerForm.tsx`**

```tsx
import React from 'react';
import type { Player, CreatePlayerDTO, Position } from '@shared/types';
import { Field, Input, Select } from '@renderer/components/ui/Field';

export interface PlayerFormValues extends CreatePlayerDTO {}

const POSITIONS: Position[] = ['OH', 'MB', 'OPP', 'S', 'L', 'DS'];

export function emptyPlayer(): PlayerFormValues {
  return {
    code: '',
    first_name: '',
    last_name: '',
    position: null,
    height_cm: null,
    weight_kg: null,
    reach_cm: null,
    photo_path: null,
  };
}

export function playerToForm(p: Player): PlayerFormValues {
  return {
    code: p.code,
    first_name: p.first_name,
    last_name: p.last_name,
    position: p.position,
    height_cm: p.height_cm,
    weight_kg: p.weight_kg,
    reach_cm: p.reach_cm,
    photo_path: p.photo_path,
  };
}

const numOrNull = (v: string): number | null => (v === '' ? null : Number(v));

export function PlayerForm({
  values,
  onChange,
}: {
  values: PlayerFormValues;
  onChange: (v: PlayerFormValues) => void;
}) {
  const set = (patch: Partial<PlayerFormValues>) => onChange({ ...values, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vorname" required>
          <Input value={values.first_name} onChange={(e) => set({ first_name: e.target.value })} />
        </Field>
        <Field label="Nachname" required>
          <Input value={values.last_name} onChange={(e) => set({ last_name: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code" required>
          <Input value={values.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="SMI-JOH" />
        </Field>
        <Field label="Position">
          <Select
            value={values.position ?? ''}
            onChange={(e) => set({ position: (e.target.value || null) as Position | null })}
          >
            <option value="">—</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Größe (cm)">
          <Input type="number" value={values.height_cm ?? ''} onChange={(e) => set({ height_cm: numOrNull(e.target.value) })} />
        </Field>
        <Field label="Gewicht (kg)">
          <Input type="number" value={values.weight_kg ?? ''} onChange={(e) => set({ weight_kg: numOrNull(e.target.value) })} />
        </Field>
        <Field label="Reichweite (cm)">
          <Input type="number" value={values.reach_cm ?? ''} onChange={(e) => set({ reach_cm: numOrNull(e.target.value) })} />
        </Field>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/renderer/features/players/PlayerList.tsx`**

```tsx
import React from 'react';
import { User, Plus, Trash2 } from 'lucide-react';
import type { Player } from '@shared/types';
import { usePlayersStore } from '@renderer/store/players.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { PlayerForm, emptyPlayer, playerToForm, type PlayerFormValues } from './PlayerForm';

export function PlayerList() {
  const { players, load, create, update, remove, error } = usePlayersStore();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<PlayerFormValues>(emptyPlayer());

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyPlayer());
    setOpen(true);
  };
  const openEdit = (p: Player) => {
    setEditId(p.id);
    setForm(playerToForm(p));
    setOpen(true);
  };
  const save = async () => {
    if (editId == null) await create(form);
    else await update(editId, form);
    setOpen(false);
  };

  return (
    <Page
      title="Spieler"
      actions={
        <Button onClick={openCreate}>
          <Plus size={16} /> Neuer Spieler
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {players.length === 0 ? (
        <EmptyState
          icon={<User size={32} />}
          title="Noch keine Spieler"
          description="Lege Spieler an, um sie Teams zuzuordnen."
          actionLabel="Neuer Spieler"
          onAction={openCreate}
        />
      ) : (
        <DataTable<Player>
          rows={players}
          rowKey={(p) => p.id}
          onRowClick={openEdit}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (p) => (
                <span className="font-medium">
                  {p.last_name}, {p.first_name}
                </span>
              ),
            },
            { key: 'code', header: 'Code', render: (p) => p.code },
            { key: 'pos', header: 'Position', render: (p) => p.position ?? '—' },
            { key: 'height', header: 'Größe', render: (p) => (p.height_cm ? `${p.height_cm} cm` : '—') },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              render: (p) => (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Spieler „${p.last_name}" löschen?`)) remove(p.id);
                  }}
                  aria-label="Löschen"
                >
                  <Trash2 size={15} />
                </IconButton>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editId == null ? 'Neuer Spieler' : 'Spieler bearbeiten'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={save} disabled={!form.first_name || !form.last_name || !form.code}>
              Speichern
            </Button>
          </>
        }
      >
        <PlayerForm values={form} onChange={setForm} />
      </Dialog>
    </Page>
  );
}
```

- [ ] **Step 7: Run full unit tests**

Run: `npx vitest run`
Expected: alle grün (teams.repo + players.repo + bestehende)

- [ ] **Step 8: Commit**

```bash
git add src/main/ipc/players.ipc.ts src/main/ipc/registry.ts src/renderer/api/players.api.ts src/renderer/store/players.store.ts src/renderer/features/players/
git commit -m "feat(players): full-stack players CRUD with screen"
```

---

## Task 9: Roster Repo + IPC + Store + Screen

**Files:**
- Create: `tests/unit/roster.repo.test.ts`
- Create: `src/main/db/roster.repo.ts`
- Create: `src/main/ipc/roster.ipc.ts`
- Modify: `src/main/ipc/registry.ts`
- Create: `src/renderer/api/roster.api.ts`
- Create: `src/renderer/store/roster.store.ts`
- Create: `src/renderer/features/teams/TeamRoster.tsx`

- [ ] **Step 1: Write failing test `tests/unit/roster.repo.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createTeam } from '../../src/main/db/teams.repo';
import { createPlayer } from '../../src/main/db/players.repo';
import { addRosterPlayer, getRoster, updateRosterPlayer, removeRosterPlayer } from '../../src/main/db/roster.repo';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function seed(db: Database.Database) {
  const team = createTeam(db, { name: 'T', code: 'TTT', coach: null });
  const player = createPlayer(db, {
    code: 'AAA-BBB',
    first_name: 'A',
    last_name: 'B',
    position: 'S',
    height_cm: null,
    weight_kg: null,
    reach_cm: null,
    photo_path: null,
  });
  return { team, player };
}

describe('roster.repo', () => {
  it('adds a player to a roster and reads booleans back', () => {
    const db = freshDb();
    const { team, player } = seed(db);
    const tp = addRosterPlayer(db, {
      team_id: team.id,
      player_id: player.id,
      shirt_number: 7,
      is_libero: false,
      is_setter: true,
    });
    expect(tp.shirt_number).toBe(7);
    expect(tp.is_setter).toBe(true);
    expect(tp.is_libero).toBe(false);
    expect(getRoster(db, team.id)).toHaveLength(1);
  });

  it('rejects duplicate shirt number in the same team', () => {
    const db = freshDb();
    const { team, player } = seed(db);
    const p2 = createPlayer(db, {
      code: 'CCC-DDD',
      first_name: 'C',
      last_name: 'D',
      position: null,
      height_cm: null,
      weight_kg: null,
      reach_cm: null,
      photo_path: null,
    });
    addRosterPlayer(db, { team_id: team.id, player_id: player.id, shirt_number: 7, is_libero: false, is_setter: false });
    expect(() =>
      addRosterPlayer(db, { team_id: team.id, player_id: p2.id, shirt_number: 7, is_libero: false, is_setter: false }),
    ).toThrowError(/existiert bereits/);
  });

  it('updates and removes a roster entry', () => {
    const db = freshDb();
    const { team, player } = seed(db);
    addRosterPlayer(db, { team_id: team.id, player_id: player.id, shirt_number: 7, is_libero: false, is_setter: false });
    const upd = updateRosterPlayer(db, team.id, player.id, { is_libero: true, shirt_number: 9 });
    expect(upd.is_libero).toBe(true);
    expect(upd.shirt_number).toBe(9);
    removeRosterPlayer(db, team.id, player.id);
    expect(getRoster(db, team.id)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/unit/roster.repo.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `src/main/db/roster.repo.ts`**

```typescript
import type Database from 'better-sqlite3';
import type { TeamPlayer, RosterEntryInput } from '@shared/types';
import { mapDbError } from './errors';

type RosterRow = Omit<TeamPlayer, 'is_libero' | 'is_setter'> & { is_libero: number; is_setter: number };

export function getRoster(db: Database.Database, teamId: number): TeamPlayer[] {
  const rows = db
    .prepare(
      `SELECT p.*, tp.shirt_number, tp.is_libero, tp.is_setter
       FROM team_players tp
       JOIN players p ON p.id = tp.player_id
       WHERE tp.team_id = ?
       ORDER BY tp.shirt_number`,
    )
    .all(teamId) as RosterRow[];
  return rows.map((r) => ({ ...r, is_libero: !!r.is_libero, is_setter: !!r.is_setter }));
}

export function addRosterPlayer(db: Database.Database, input: RosterEntryInput): TeamPlayer {
  try {
    db.prepare(
      `INSERT INTO team_players (team_id, player_id, shirt_number, is_libero, is_setter)
       VALUES (@team_id, @player_id, @shirt_number, @is_libero, @is_setter)`,
    ).run({
      ...input,
      is_libero: input.is_libero ? 1 : 0,
      is_setter: input.is_setter ? 1 : 0,
    });
  } catch (e) {
    return mapDbError(e, { entity: 'Aufstellung', field: 'Trikotnummer' });
  }
  return getRoster(db, input.team_id).find((p) => p.id === input.player_id)!;
}

export function updateRosterPlayer(
  db: Database.Database,
  teamId: number,
  playerId: number,
  fields: Partial<{ shirt_number: number; is_libero: boolean; is_setter: boolean }>,
): TeamPlayer {
  const out: Record<string, number> = {};
  if (fields.shirt_number != null) out.shirt_number = fields.shirt_number;
  if (fields.is_libero != null) out.is_libero = fields.is_libero ? 1 : 0;
  if (fields.is_setter != null) out.is_setter = fields.is_setter ? 1 : 0;
  const keys = Object.keys(out);
  if (keys.length > 0) {
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    try {
      db.prepare(`UPDATE team_players SET ${sets} WHERE team_id = @team_id AND player_id = @player_id`).run({
        ...out,
        team_id: teamId,
        player_id: playerId,
      });
    } catch (e) {
      return mapDbError(e, { entity: 'Aufstellung', field: 'Trikotnummer' });
    }
  }
  return getRoster(db, teamId).find((p) => p.id === playerId)!;
}

export function removeRosterPlayer(db: Database.Database, teamId: number, playerId: number): void {
  db.prepare('DELETE FROM team_players WHERE team_id = ? AND player_id = ?').run(teamId, playerId);
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/unit/roster.repo.test.ts`
Expected: 3 tests pass

- [ ] **Step 5: Write `src/main/ipc/roster.ipc.ts`**

```typescript
import type { RosterEntryInput } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/roster.repo';

export function registerRosterIPC(): void {
  handle(IPC.ROSTER_GET, (_e, { team_id }: { team_id: number }) => repo.getRoster(getDb(), team_id));
  handle(IPC.ROSTER_ADD_PLAYER, (_e, input: RosterEntryInput) => repo.addRosterPlayer(getDb(), input));
  handle(
    IPC.ROSTER_UPDATE,
    (_e, { team_id, player_id, ...fields }: { team_id: number; player_id: number } & Partial<{ shirt_number: number; is_libero: boolean; is_setter: boolean }>) =>
      repo.updateRosterPlayer(getDb(), team_id, player_id, fields),
  );
  handle(IPC.ROSTER_REMOVE_PLAYER, (_e, { team_id, player_id }: { team_id: number; player_id: number }) =>
    repo.removeRosterPlayer(getDb(), team_id, player_id),
  );
}
```

- [ ] **Step 6: Register in `src/main/ipc/registry.ts`**

```typescript
import { registerSeasonsIPC } from './seasons.ipc';
import { registerTeamsIPC } from './teams.ipc';
import { registerPlayersIPC } from './players.ipc';
import { registerRosterIPC } from './roster.ipc';

export function registerAllIPC(): void {
  registerSeasonsIPC();
  registerTeamsIPC();
  registerPlayersIPC();
  registerRosterIPC();
}
```

- [ ] **Step 7: Write `src/renderer/api/roster.api.ts`**

```typescript
import { IPC } from '@shared/ipc-channels';
import type { TeamPlayer, RosterEntryInput } from '@shared/types';

type RosterPatch = Partial<{ shirt_number: number; is_libero: boolean; is_setter: boolean }>;

export const rosterApi = {
  get: (teamId: number) => window.ipc.invoke<TeamPlayer[]>(IPC.ROSTER_GET, { team_id: teamId }),
  add: (input: RosterEntryInput) => window.ipc.invoke<TeamPlayer>(IPC.ROSTER_ADD_PLAYER, input),
  update: (teamId: number, playerId: number, fields: RosterPatch) =>
    window.ipc.invoke<TeamPlayer>(IPC.ROSTER_UPDATE, { team_id: teamId, player_id: playerId, ...fields }),
  remove: (teamId: number, playerId: number) =>
    window.ipc.invoke<void>(IPC.ROSTER_REMOVE_PLAYER, { team_id: teamId, player_id: playerId }),
};
```

- [ ] **Step 8: Write `src/renderer/store/roster.store.ts`**

```typescript
import { create } from 'zustand';
import type { TeamPlayer, RosterEntryInput } from '@shared/types';
import { rosterApi } from '@renderer/api/roster.api';

type RosterPatch = Partial<{ shirt_number: number; is_libero: boolean; is_setter: boolean }>;

interface RosterStore {
  roster: TeamPlayer[];
  error: string | null;
  load: (teamId: number) => Promise<void>;
  add: (input: RosterEntryInput) => Promise<void>;
  update: (teamId: number, playerId: number, fields: RosterPatch) => Promise<void>;
  remove: (teamId: number, playerId: number) => Promise<void>;
}

export const useRosterStore = create<RosterStore>((set, get) => ({
  roster: [],
  error: null,
  load: async (teamId) => {
    try {
      set({ roster: await rosterApi.get(teamId), error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  add: async (input) => {
    try {
      await rosterApi.add(input);
      await get().load(input.team_id);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  update: async (teamId, playerId, fields) => {
    try {
      await rosterApi.update(teamId, playerId, fields);
      await get().load(teamId);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  remove: async (teamId, playerId) => {
    try {
      await rosterApi.remove(teamId, playerId);
      await get().load(teamId);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
```

- [ ] **Step 9: Write `src/renderer/features/teams/TeamRoster.tsx`**

```tsx
import React from 'react';
import { Trash2 } from 'lucide-react';
import type { TeamRecord } from '@shared/types';
import { useRosterStore } from '@renderer/store/roster.store';
import { usePlayersStore } from '@renderer/store/players.store';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { Field, Input, Select } from '@renderer/components/ui/Field';

export function TeamRoster({ team, onClose }: { team: TeamRecord; onClose: () => void }) {
  const { roster, load, add, update, remove, error } = useRosterStore();
  const { players, load: loadPlayers } = usePlayersStore();
  const [playerId, setPlayerId] = React.useState<string>('');
  const [shirt, setShirt] = React.useState<string>('');

  React.useEffect(() => {
    load(team.id);
    loadPlayers();
  }, [team.id, load, loadPlayers]);

  const rosterIds = new Set(roster.map((r) => r.id));
  const available = players.filter((p) => !rosterIds.has(p.id));

  const addPlayer = async () => {
    if (!playerId || !shirt) return;
    await add({
      team_id: team.id,
      player_id: Number(playerId),
      shirt_number: Number(shirt),
      is_libero: false,
      is_setter: false,
    });
    setPlayerId('');
    setShirt('');
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Kader — ${team.name}`}
      className="max-w-2xl"
      footer={<Button onClick={onClose}>Fertig</Button>}
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="mb-4 grid grid-cols-[1fr_120px_auto] items-end gap-2">
        <Field label="Spieler">
          <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            <option value="">Auswählen…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name}, {p.first_name} ({p.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nr.">
          <Input type="number" value={shirt} onChange={(e) => setShirt(e.target.value)} />
        </Field>
        <Button onClick={addPlayer} disabled={!playerId || !shirt}>
          Hinzufügen
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs text-zinc-400">
              <th className="px-3 py-2">Nr.</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-center">Libero</th>
              <th className="px-3 py-2 text-center">Setter</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {roster.map((p) => (
              <tr key={p.id} className="border-b border-zinc-800/60 last:border-0">
                <td className="px-3 py-2 font-medium text-zinc-100">{p.shirt_number}</td>
                <td className="px-3 py-2 text-zinc-200">
                  {p.last_name}, {p.first_name}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={p.is_libero}
                    onChange={(e) => update(team.id, p.id, { is_libero: e.target.checked })}
                    className="accent-sky-500"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={p.is_setter}
                    onChange={(e) => update(team.id, p.id, { is_setter: e.target.checked })}
                    className="accent-sky-500"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <IconButton onClick={() => remove(team.id, p.id)} aria-label="Entfernen">
                    <Trash2 size={15} />
                  </IconButton>
                </td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-xs text-zinc-500">
                  Noch keine Spieler im Kader.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 10: Run full unit tests**

Run: `npx vitest run`
Expected: alle grün (inkl. roster.repo)

- [ ] **Step 11: Commit**

```bash
git add tests/unit/roster.repo.test.ts src/main/db/roster.repo.ts src/main/ipc/roster.ipc.ts src/main/ipc/registry.ts src/renderer/api/roster.api.ts src/renderer/store/roster.store.ts src/renderer/features/teams/TeamRoster.tsx
git commit -m "feat(roster): full-stack roster management with team kader dialog"
```

---

## Task 10: Matches Repo (TDD)

**Files:**
- Create: `tests/unit/matches.repo.test.ts`
- Create: `src/main/db/matches.repo.ts`

- [ ] **Step 1: Write failing test `tests/unit/matches.repo.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createTeam } from '../../src/main/db/teams.repo';
import { createMatch, listMatches, getMatch } from '../../src/main/db/matches.repo';
import type { CreateMatchDTO } from '@shared/types';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function baseMatch(home: number, away: number): CreateMatchDTO {
  return {
    season_id: null,
    home_team_id: home,
    away_team_id: away,
    match_date: '2026-01-15',
    venue: 'Halle 1',
    video_path: null,
    video_offset_ms: 0,
    comment: null,
    dvw_source_file: null,
  };
}

describe('matches.repo', () => {
  it('creates a match and lists it with team names', () => {
    const db = freshDb();
    const h = createTeam(db, { name: 'Home', code: 'HOM', coach: null });
    const a = createTeam(db, { name: 'Away', code: 'AWY', coach: null });
    const m = createMatch(db, baseMatch(h.id, a.id));
    expect(m.home_team.name).toBe('Home');
    const rows = listMatches(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].home_team_name).toBe('Home');
    expect(rows[0].away_team_name).toBe('Away');
  });

  it('rejects a match where home equals away', () => {
    const db = freshDb();
    const t = createTeam(db, { name: 'T', code: 'TTT', coach: null });
    expect(() => createMatch(db, baseMatch(t.id, t.id))).toThrowError(/unterschiedlich/);
  });

  it('reads a match detail with both teams', () => {
    const db = freshDb();
    const h = createTeam(db, { name: 'Home', code: 'HOM', coach: null });
    const a = createTeam(db, { name: 'Away', code: 'AWY', coach: null });
    const m = createMatch(db, baseMatch(h.id, a.id));
    const detail = getMatch(db, m.id);
    expect(detail.away_team.code).toBe('AWY');
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx vitest run tests/unit/matches.repo.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `src/main/db/matches.repo.ts`**

```typescript
import type Database from 'better-sqlite3';
import type { Match, MatchRow, MatchDetail, TeamRecord, CreateMatchDTO } from '@shared/types';
import { mapDbError } from './errors';

function assertDistinct(home: number, away: number): void {
  if (home === away) {
    throw new Error('Spiel: Heim- und Gastteam müssen unterschiedlich sein.');
  }
}

export function getMatch(db: Database.Database, id: number): MatchDetail {
  const m = db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as Match;
  const home = db.prepare('SELECT * FROM teams WHERE id = ?').get(m.home_team_id) as TeamRecord;
  const away = db.prepare('SELECT * FROM teams WHERE id = ?').get(m.away_team_id) as TeamRecord;
  return { ...m, home_team: home, away_team: away };
}

export function listMatches(db: Database.Database, seasonId?: number): MatchRow[] {
  const where = seasonId != null ? 'WHERE m.season_id = ?' : '';
  const sql = `
    SELECT m.*, h.name AS home_team_name, v.name AS away_team_name
    FROM matches m
    JOIN teams h ON h.id = m.home_team_id
    JOIN teams v ON v.id = m.away_team_id
    ${where}
    ORDER BY m.match_date DESC, m.id DESC
  `;
  const stmt = db.prepare(sql);
  return (seasonId != null ? stmt.all(seasonId) : stmt.all()) as MatchRow[];
}

export function createMatch(db: Database.Database, dto: CreateMatchDTO): MatchDetail {
  assertDistinct(dto.home_team_id, dto.away_team_id);
  try {
    const r = db
      .prepare(
        `INSERT INTO matches
          (season_id, home_team_id, away_team_id, match_date, venue, video_path, video_offset_ms, comment, dvw_source_file)
         VALUES
          (@season_id, @home_team_id, @away_team_id, @match_date, @venue, @video_path, @video_offset_ms, @comment, @dvw_source_file)`,
      )
      .run({
        season_id: null,
        match_date: null,
        venue: null,
        video_path: null,
        video_offset_ms: 0,
        comment: null,
        dvw_source_file: null,
        ...dto,
      });
    return getMatch(db, Number(r.lastInsertRowid));
  } catch (e) {
    return mapDbError(e, { entity: 'Spiel' });
  }
}

export function updateMatch(db: Database.Database, id: number, fields: Partial<Match>): MatchDetail {
  const cur = db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as Match;
  const home = fields.home_team_id ?? cur.home_team_id;
  const away = fields.away_team_id ?? cur.away_team_id;
  assertDistinct(home, away);
  const keys = Object.keys(fields);
  if (keys.length > 0) {
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    try {
      db.prepare(`UPDATE matches SET ${sets} WHERE id = @id`).run({ ...fields, id });
    } catch (e) {
      return mapDbError(e, { entity: 'Spiel' });
    }
  }
  return getMatch(db, id);
}

export function deleteMatch(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM matches WHERE id = ?').run(id);
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx vitest run tests/unit/matches.repo.test.ts`
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add tests/unit/matches.repo.test.ts src/main/db/matches.repo.ts
git commit -m "feat(matches): add matches repo with validation (TDD)"
```

---

## Task 11: Matches IPC + API + Store + Screen

**Files:**
- Create: `src/main/ipc/matches.ipc.ts`
- Modify: `src/main/ipc/registry.ts`
- Create: `src/renderer/api/matches.api.ts`
- Create: `src/renderer/store/matches.store.ts`
- Create: `src/renderer/features/matches/MatchForm.tsx`
- Create: `src/renderer/features/matches/MatchList.tsx`

- [ ] **Step 1: Write `src/main/ipc/matches.ipc.ts`**

```typescript
import type { CreateMatchDTO, Match } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { getDb } from '../db/connection';
import { handle } from './handle';
import * as repo from '../db/matches.repo';

export function registerMatchesIPC(): void {
  handle(IPC.MATCHES_LIST, (_e, { season_id }: { season_id?: number } = {}) =>
    repo.listMatches(getDb(), season_id),
  );
  handle(IPC.MATCHES_GET, (_e, { id }: { id: number }) => repo.getMatch(getDb(), id));
  handle(IPC.MATCHES_CREATE, (_e, dto: CreateMatchDTO) => repo.createMatch(getDb(), dto));
  handle(IPC.MATCHES_UPDATE, (_e, { id, ...fields }: Partial<Match> & { id: number }) =>
    repo.updateMatch(getDb(), id, fields),
  );
  handle(IPC.MATCHES_DELETE, (_e, { id }: { id: number }) => repo.deleteMatch(getDb(), id));
}
```

- [ ] **Step 2: Register in `src/main/ipc/registry.ts`**

```typescript
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
```

- [ ] **Step 3: Write `src/renderer/api/matches.api.ts`**

```typescript
import { IPC } from '@shared/ipc-channels';
import type { MatchRow, MatchDetail, CreateMatchDTO, Match } from '@shared/types';

export const matchesApi = {
  list: (seasonId?: number) => window.ipc.invoke<MatchRow[]>(IPC.MATCHES_LIST, { season_id: seasonId }),
  get: (id: number) => window.ipc.invoke<MatchDetail>(IPC.MATCHES_GET, { id }),
  create: (data: CreateMatchDTO) => window.ipc.invoke<MatchDetail>(IPC.MATCHES_CREATE, data),
  update: (id: number, data: Partial<Match>) =>
    window.ipc.invoke<MatchDetail>(IPC.MATCHES_UPDATE, { id, ...data }),
  delete: (id: number) => window.ipc.invoke<void>(IPC.MATCHES_DELETE, { id }),
};
```

- [ ] **Step 4: Write `src/renderer/store/matches.store.ts`**

```typescript
import { create } from 'zustand';
import type { MatchRow, CreateMatchDTO, Match } from '@shared/types';
import { matchesApi } from '@renderer/api/matches.api';

interface MatchesStore {
  matches: MatchRow[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (data: CreateMatchDTO) => Promise<void>;
  update: (id: number, data: Partial<Match>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useMatchesStore = create<MatchesStore>((set, get) => ({
  matches: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ matches: await matchesApi.list(), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (data) => {
    await matchesApi.create(data);
    await get().load();
  },
  update: async (id, data) => {
    await matchesApi.update(id, data);
    await get().load();
  },
  remove: async (id) => {
    await matchesApi.delete(id);
    await get().load();
  },
}));
```

- [ ] **Step 5: Write `src/renderer/features/matches/MatchForm.tsx`**

```tsx
import React from 'react';
import type { MatchDetail, CreateMatchDTO, TeamRecord } from '@shared/types';
import { Field, Input, Textarea, Select } from '@renderer/components/ui/Field';

export interface MatchFormValues extends CreateMatchDTO {}

export function emptyMatch(): MatchFormValues {
  return {
    season_id: null,
    home_team_id: 0,
    away_team_id: 0,
    match_date: null,
    venue: null,
    video_path: null,
    video_offset_ms: 0,
    comment: null,
    dvw_source_file: null,
  };
}

export function matchToForm(m: MatchDetail): MatchFormValues {
  return {
    season_id: m.season_id,
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
    match_date: m.match_date,
    venue: m.venue,
    video_path: m.video_path,
    video_offset_ms: m.video_offset_ms,
    comment: m.comment,
    dvw_source_file: m.dvw_source_file,
  };
}

export function MatchForm({
  values,
  teams,
  onChange,
}: {
  values: MatchFormValues;
  teams: TeamRecord[];
  onChange: (v: MatchFormValues) => void;
}) {
  const set = (patch: Partial<MatchFormValues>) => onChange({ ...values, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Heimteam" required>
          <Select value={values.home_team_id || ''} onChange={(e) => set({ home_team_id: Number(e.target.value) })}>
            <option value="">Auswählen…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gastteam" required>
          <Select value={values.away_team_id || ''} onChange={(e) => set({ away_team_id: Number(e.target.value) })}>
            <option value="">Auswählen…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Datum">
          <Input type="date" value={values.match_date ?? ''} onChange={(e) => set({ match_date: e.target.value || null })} />
        </Field>
        <Field label="Halle">
          <Input value={values.venue ?? ''} onChange={(e) => set({ venue: e.target.value || null })} />
        </Field>
      </div>
      <Field label="Kommentar">
        <Textarea value={values.comment ?? ''} onChange={(e) => set({ comment: e.target.value || null })} />
      </Field>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/renderer/features/matches/MatchList.tsx`**

```tsx
import React from 'react';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import type { MatchRow } from '@shared/types';
import { useMatchesStore } from '@renderer/store/matches.store';
import { useTeamsStore } from '@renderer/store/teams.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { MatchForm, emptyMatch, type MatchFormValues } from './MatchForm';
import { matchesApi } from '@renderer/api/matches.api';

export function MatchList() {
  const { matches, load, create, update, remove, error } = useMatchesStore();
  const { teams, load: loadTeams } = useTeamsStore();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<MatchFormValues>(emptyMatch());

  React.useEffect(() => {
    load();
    loadTeams();
  }, [load, loadTeams]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyMatch());
    setOpen(true);
  };
  const openEdit = async (m: MatchRow) => {
    const detail = await matchesApi.get(m.id);
    setEditId(m.id);
    setForm({
      season_id: detail.season_id,
      home_team_id: detail.home_team_id,
      away_team_id: detail.away_team_id,
      match_date: detail.match_date,
      venue: detail.venue,
      video_path: detail.video_path,
      video_offset_ms: detail.video_offset_ms,
      comment: detail.comment,
      dvw_source_file: detail.dvw_source_file,
    });
    setOpen(true);
  };
  const save = async () => {
    if (editId == null) await create(form);
    else await update(editId, form);
    setOpen(false);
  };

  const valid = form.home_team_id > 0 && form.away_team_id > 0 && form.home_team_id !== form.away_team_id;

  return (
    <Page
      title="Spiele"
      actions={
        <Button onClick={openCreate}>
          <Plus size={16} /> Neues Spiel
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {matches.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={32} />}
          title="Noch keine Spiele"
          description="Lege ein Spiel an, um es anschließend zu scouten."
          actionLabel="Neues Spiel"
          onAction={openCreate}
        />
      ) : (
        <DataTable<MatchRow>
          rows={matches}
          rowKey={(m) => m.id}
          onRowClick={openEdit}
          columns={[
            {
              key: 'teams',
              header: 'Begegnung',
              render: (m) => (
                <span className="font-medium">
                  {m.home_team_name} <span className="text-zinc-500">vs</span> {m.away_team_name}
                </span>
              ),
            },
            { key: 'date', header: 'Datum', render: (m) => m.match_date ?? '—' },
            { key: 'venue', header: 'Halle', render: (m) => m.venue ?? '—' },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              render: (m) => (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Spiel löschen?')) remove(m.id);
                  }}
                  aria-label="Löschen"
                >
                  <Trash2 size={15} />
                </IconButton>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editId == null ? 'Neues Spiel' : 'Spiel bearbeiten'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={save} disabled={!valid}>
              Speichern
            </Button>
          </>
        }
      >
        <MatchForm values={form} teams={teams} onChange={setForm} />
      </Dialog>
    </Page>
  );
}
```

- [ ] **Step 7: Run full unit tests**

Run: `npx vitest run`
Expected: alle grün (teams/players/roster/matches repos + bestehende)

- [ ] **Step 8: Commit**

```bash
git add src/main/ipc/matches.ipc.ts src/main/ipc/registry.ts src/renderer/api/matches.api.ts src/renderer/store/matches.store.ts src/renderer/features/matches/
git commit -m "feat(matches): full-stack matches CRUD with screen"
```

---

## Task 12: Tab-Router + Home-Dashboard

**Files:**
- Create: `src/renderer/features/home/HomeScreen.tsx`
- Create: `src/renderer/features/layout/TabContent.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Write `src/renderer/features/home/HomeScreen.tsx`**

```tsx
import React from 'react';
import { Calendar, Users, User, ClipboardList } from 'lucide-react';
import { useUIStore, type TabType } from '@renderer/store/ui.store';

const cards: { type: TabType; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'season', label: 'Saisons', icon: Calendar, desc: 'Saisons anlegen und verwalten' },
  { type: 'team', label: 'Teams', icon: Users, desc: 'Teams und Kader pflegen' },
  { type: 'player', label: 'Spieler', icon: User, desc: 'Spielerdatenbank' },
  { type: 'match', label: 'Spiele', icon: ClipboardList, desc: 'Spiele anlegen und scouten' },
];

export function HomeScreen() {
  const { openTab } = useUIStore();
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-100">Übersicht</h1>
      </header>
      <div className="grid flex-1 grid-cols-2 content-start gap-4 overflow-auto p-6">
        {cards.map((c) => (
          <button
            key={c.type}
            onClick={() => openTab({ type: c.type, label: c.label, params: {} })}
            className="flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            <div className="rounded-xl bg-sky-600/15 p-3 text-sky-400">
              <c.icon size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{c.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{c.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/renderer/features/layout/TabContent.tsx`**

```tsx
import React from 'react';
import { useUIStore } from '@renderer/store/ui.store';
import { HomeScreen } from '@renderer/features/home/HomeScreen';
import { SeasonList } from '@renderer/features/seasons/SeasonList';
import { TeamList } from '@renderer/features/teams/TeamList';
import { PlayerList } from '@renderer/features/players/PlayerList';
import { MatchList } from '@renderer/features/matches/MatchList';

export function TabContent() {
  const { tabs, activeTabId } = useUIStore();
  const active = tabs.find((t) => t.id === activeTabId);

  if (!active) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Kein Tab offen</div>;
  }

  switch (active.type) {
    case 'home':
      return <HomeScreen />;
    case 'season':
      return <SeasonList />;
    case 'team':
      return <TeamList />;
    case 'player':
      return <PlayerList />;
    case 'match':
      return <MatchList />;
    case 'report':
      return (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Reports kommen in Phase 1c.
        </div>
      );
    default:
      return <div className="flex flex-1 items-center justify-center text-zinc-500">Unbekannter Tab</div>;
  }
}
```

- [ ] **Step 3: Modify `src/renderer/App.tsx`**

Ersetze den kompletten Inhalt:

```tsx
import React from 'react';
import { TabBar } from './features/layout/TabBar';
import { Sidebar } from './features/layout/Sidebar';
import { TabContent } from './features/layout/TabContent';
import { useUIStore } from './store/ui.store';

export default function App(): React.ReactElement {
  const { openTab, tabs } = useUIStore();

  React.useEffect(() => {
    if (tabs.length === 0) {
      openTab({ type: 'home', label: 'Home', params: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
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

- [ ] **Step 4: Start dev server — verify shell renders screens**

Run: `npm run dev`
Expected: App öffnet; Home-Dashboard zeigt 4 Karten; Sidebar-Klicks öffnen Saisons/Teams/Spieler/Spiele als Tabs; jeder Screen rendert ohne Konsolenfehler.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/features/home/ src/renderer/features/layout/TabContent.tsx src/renderer/App.tsx
git commit -m "feat(ui): wire tab router with home dashboard and feature screens"
```

---

## Task 13: End-to-End-Verifikation (manuell) + Abschluss

- [ ] **Step 1: Alle Unit-Tests**

Run: `npx vitest run`
Expected: migrations + ui.store + teams.repo + players.repo + roster.repo + matches.repo — alle grün.

- [ ] **Step 2: Manueller Durchstich in `npm run dev`**

Reihenfolge durchklicken und je bestätigen:
1. Saison anlegen (Name + Code) → erscheint in Liste, übersteht App-Neustart.
2. Zwei Teams anlegen (eindeutige Codes) → Versuch eines doppelten Codes zeigt freundliche Fehlermeldung.
3. Drei Spieler anlegen → ungültige Position nicht möglich (Select bietet nur valide).
4. Bei einem Team „Kader" öffnen → Spieler mit Trikotnummern hinzufügen, Libero/Setter togglen, doppelte Nummer zeigt Fehler.
5. Spiel anlegen (Heim ≠ Gast erzwungen) → erscheint mit beiden Teamnamen in Liste.
6. Team löschen, das in einem Spiel referenziert ist → freundliche „wird noch verwendet"-Meldung.
7. App schließen und neu starten → alle Daten noch da.

- [ ] **Step 3: Finaler Commit**

```bash
git add -A
git commit -m "chore: Phase 1a complete — data management CRUD with styled UI"
```

---

## Definition of Done (Phase 1a)

- [ ] Seasons/Teams/Players/Roster/Matches per UI vollständig anlegbar, editierbar, löschbar.
- [ ] Validierung: doppelter Code, Heim≠Gast, doppelte Trikotnummer, Delete-Schutz bei Referenz — alle mit freundlicher Meldung.
- [ ] Repo-Unit-Tests für teams/players/roster/matches grün; `npx vitest run` ohne Fehler.
- [ ] Jeder Sidebar-Eintrag öffnet einen funktionierenden, gestylten Screen — kein nacktes HTML-Control.
- [ ] Daten persistent über App-Neustart.

## Nächster Plan

`phase-1b-scouting.md` — Code-Parser + Validator + Scoring (TDD) + ScoutingView + Lineup-Dialog. Baut auf den hier erstellten Stores (`teams`, `players`, `roster`, `matches`) auf.
