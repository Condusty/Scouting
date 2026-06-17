# Testdaten-Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run seed` füllt `scouting.dev.db` mit 1 Season, 6 Nationalteams und je 14 Spielern/Kader-Einträgen, nach komplettem Wipe der DB.

**Architecture:** Zwei neue Dateien unter `scripts/`: `seed-data.ts` (reine Daten + Builder, unit-testbar) und `seed-test-data.ts` (CLI: öffnet `scouting.dev.db` via better-sqlite3, wendet Migration `001_initial.sql` an, wiped alle Tabellen, reseeded via `buildSeedData()` + bestehenden Repo-Funktionen `createTeam`/`createPlayer`/`addRosterPlayer`).

**Tech Stack:** better-sqlite3, tsx (neues devDependency für TS-CLI mit tsconfig-paths), vitest.

Referenz: `docs/superpowers/specs/2026-06-15-test-data-generator-design.md`

---

### Task 1: tsx-Dependency + npm-Skript

**Files:**
- Modify: `package.json`

- [ ] **Step 1: tsx installieren**

```bash
npm install -D tsx
```

- [ ] **Step 2: npm-Skript hinzufügen**

In `package.json` → `"scripts"` (neben `"preview"`):

```json
"seed": "tsx scripts/seed-test-data.ts"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tsx for dev seed script"
```

---

### Task 2: `seed-data.ts` — Builder (TDD)

**Files:**
- Create: `scripts/seed-data.ts`
- Test: `tests/unit/seed-data.test.ts`

Liefert reine Daten/Funktionen, kein DB-Zugriff. Exportierte Typen/Funktion:

```ts
export interface PlayerSeed {
  player: CreatePlayerDTO; // code, first_name, last_name, position, height_cm, weight_kg, reach_cm, photo_path
  roster: { shirt_number: number; is_libero: boolean; is_setter: boolean };
}
export interface TeamSeed {
  team: CreateTeamDTO; // name, code, coach
  players: PlayerSeed[];
}
export interface SeedData {
  season: CreateSeasonDTO; // name, code, start_date, end_date, default_video_dir
  teams: TeamSeed[];
}
export function buildSeedData(): SeedData
```

(`CreateSeasonDTO`/`CreateTeamDTO`/`CreatePlayerDTO` aus `@shared/types`.)

- [ ] **Step 1: Test schreiben**

`tests/unit/seed-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSeedData } from '../../scripts/seed-data';

describe('buildSeedData', () => {
  const data = buildSeedData();

  it('returns 1 season and 6 teams', () => {
    expect(data.teams).toHaveLength(6);
    expect(data.season.code).toBeTruthy();
  });

  it('each team has 14 players with correct position distribution', () => {
    for (const t of data.teams) {
      expect(t.players).toHaveLength(14);
      const counts: Record<string, number> = {};
      for (const p of t.players) {
        const pos = p.player.position!;
        counts[pos] = (counts[pos] ?? 0) + 1;
      }
      expect(counts).toEqual({ S: 2, L: 2, OH: 4, MB: 3, OPP: 3 });
    }
  });

  it('player codes are globally unique', () => {
    const codes = data.teams.flatMap((t) => t.players.map((p) => p.player.code));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('shirt numbers are unique per team within 1-18', () => {
    for (const t of data.teams) {
      const numbers = t.players.map((p) => p.roster.shirt_number);
      expect(new Set(numbers).size).toBe(14);
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(18);
      }
    }
  });

  it('is_setter/is_libero match position, height/weight/reach are set', () => {
    for (const t of data.teams) {
      for (const p of t.players) {
        expect(p.roster.is_setter).toBe(p.player.position === 'S');
        expect(p.roster.is_libero).toBe(p.player.position === 'L');
        expect(p.player.height_cm).toBeGreaterThan(150);
        expect(p.player.weight_kg).toBeGreaterThan(50);
        expect(p.player.reach_cm).toBeGreaterThan(p.player.height_cm!);
      }
    }
  });
});
```

- [ ] **Step 2: Test laufen lassen, muss fehlschlagen**

Run: `npx vitest run tests/unit/seed-data.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/seed-data'`

- [ ] **Step 3: `scripts/seed-data.ts` implementieren**

Struktur:

- `NATIONAL_TEAMS: { name: string; code: string }[]` — 6 Einträge: Deutschland/GER, Polen/POL, Italien/ITA, Brasilien/BRA, USA/USA, Frankreich/FRA. `coach: null`.
- `SEASON: CreateSeasonDTO` — `{ name: 'Test-Saison 2025/26', code: 'TEST-2526', start_date: '2025-09-01', end_date: '2026-05-31', default_video_dir: null }`.
- `ROSTER_PLAN: Position[]` — 14 Einträge, Verteilung 2× `'S'`, 2× `'L'`, 4× `'OH'`, 3× `'MB'`, 3× `'OPP'` (Reihenfolge egal).
- `NAME_POOLS: Record<string, { first: string[]; last: string[] }>` — pro Teamcode 14 Vornamen + 14 Nachnamen, jeweils national passend und realistisch klingend (z.B. für GER deutsche Namen, für BRA brasilianische, etc.), keine echten Spielernamen. Vorname/Nachname Index `i` → Spieler `i` (Index 0-13).
- `POSITION_RANGES: Record<Position, { height: [number, number]; weight: [number, number]; reachOffset: [number, number] }>` — z.B. `S: { height: [188,198], weight: [78,88], reachOffset: [30,34] }`, `L: { height: [178,188], weight: [70,80], reachOffset: [28,32] }`, `OH: { height: [195,203], weight: [85,95], reachOffset: [30,35] }`, `MB: { height: [200,210], weight: [88,100], reachOffset: [32,38] }`, `OPP: { height: [196,205], weight: [88,98], reachOffset: [30,35] }`.
- Helper `randInt(min, max)` — `Math.floor(Math.random() * (max - min + 1)) + min`.
- Helper `shuffle<T>(arr: T[]): T[]` — Fisher-Yates, gibt neue Kopie zurück.
- `buildSeedData(): SeedData`:
  - Für jedes Team aus `NATIONAL_TEAMS`: `shirtNumbers = shuffle([1..18]).slice(0, 14)`.
  - Für jeden Index `i` (0-13): `position = ROSTER_PLAN[i]`, Range aus `POSITION_RANGES[position]`, `height = randInt(...)`, `reach = height + randInt(...reachOffset)`, `weight = randInt(...)`.
  - `player.code = \`${team.code}-${String(i + 1).padStart(2, '0')}\`` (z.B. `GER-01`).
  - `roster = { shirt_number: shirtNumbers[i], is_libero: position === 'L', is_setter: position === 'S' }`.
  - `photo_path: null`.

- [ ] **Step 4: Test laufen lassen, muss bestehen**

Run: `npx vitest run tests/unit/seed-data.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-data.ts tests/unit/seed-data.test.ts
git commit -m "feat: add pure seed-data builder for national-team test data"
```

---

### Task 3: `seed-test-data.ts` — CLI (Wipe + Reseed)

**Files:**
- Create: `scripts/seed-test-data.ts`

Kein Unit-Test (reines DB-I/O-Skript) — Verifikation in Task 4.

- [ ] **Step 1: Skript implementieren**

`scripts/seed-test-data.ts`:

- Imports: `Database` von `better-sqlite3`, `readFileSync`/`join` für Migration, `buildSeedData` aus `./seed-data`, `createTeam` aus `@/../src/main/db/teams.repo` (relativer Pfad: `../src/main/db/teams.repo`), `createPlayer` aus `../src/main/db/players.repo`, `addRosterPlayer` aus `../src/main/db/roster.repo`.
- DB öffnen: `new Database(join(process.cwd(), 'scouting.dev.db'))`, `pragma('journal_mode = WAL')`, `pragma('foreign_keys = ON')`.
- Migration anwenden: `migrations`-Tabelle anlegen (gleiches `CREATE TABLE IF NOT EXISTS migrations (...)` wie in `src/main/db/migrate.ts`), `001_initial.sql` einlesen via `readFileSync(join(__dirname, '../src/main/db/migrations/001_initial.sql'), 'utf-8')`, `db.exec(sql)`, falls Version 1 noch nicht in `migrations` → `INSERT INTO migrations(version) VALUES (1)`.
- Wipe: `db.pragma('foreign_keys = OFF')`, dann `DELETE FROM` für jede Tabelle außer `migrations`, in dieser Reihenfolge: `rally_flags, timeouts, substitutions, actions, rallies, sets, matches, team_players, player_merges, players, team_merges, season_teams, teams, seasons, settings`. Danach `db.pragma('foreign_keys = ON')`.
- Reseed mit `const data = buildSeedData()`:
  - Season per raw SQL: `INSERT INTO seasons (name, code, start_date, end_date, default_video_dir) VALUES (@name, @code, @start_date, @end_date, @default_video_dir)`, `seasonId = lastInsertRowid`.
  - Für jedes `teamSeed` in `data.teams`:
    - `team = createTeam(db, teamSeed.team)`
    - `db.prepare('INSERT INTO season_teams (season_id, team_id) VALUES (?, ?)').run(seasonId, team.id)`
    - Für jedes `playerSeed`: `player = createPlayer(db, playerSeed.player)`, dann `addRosterPlayer(db, { team_id: team.id, player_id: player.id, ...playerSeed.roster })`.
- Output: `console.log` mit Anzahl Seasons (1), Teams (6), Spielern (84).

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat: add seed-test-data CLI script (wipe + reseed dev DB)"
```

---

### Task 4: Verifikation

- [ ] **Step 1: Skript ausführen**

Run: `npm run seed`
Expected: Output zeigt 1 Season, 6 Teams, 84 Spieler, kein Fehler.

- [ ] **Step 2: DB-Inhalt prüfen**

Run:
```bash
node -e "const db=require('better-sqlite3')('scouting.dev.db'); console.log(db.prepare('SELECT count(*) c FROM seasons').get(), db.prepare('SELECT count(*) c FROM teams').get(), db.prepare('SELECT count(*) c FROM players').get(), db.prepare('SELECT count(*) c FROM team_players').get())"
```
Expected: `{c:1} {c:6} {c:84} {c:84}`

- [ ] **Step 3: Erneut ausführen (Re-Run prüft Wipe)**

Run: `npm run seed`
Expected: Gleiche Counts wie Step 2 (kein Duplikat-Wachstum).

- [ ] **Step 4: Bestehende Tests laufen lassen**

Run: `npm test`
Expected: alle Tests weiterhin grün.
