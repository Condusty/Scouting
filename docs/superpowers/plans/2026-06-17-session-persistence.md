# Session-Persistenz & Auto-Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lineup wird pro Satz in der DB gespeichert; beim Wiederöffnen wird die Session ohne Lineup-Dialog wiederhergestellt; Satzende wird automatisch bei 25+2 (Satz 5: 15+2) erkannt.

**Architecture:** Neue `sets`-Spalten speichern Lineup + Aufschlagteam (Migration 002). `startSession` erkennt automatisch den aktiven Satz und rekonstruiert Score/Rotation aus gespeicherten Rallies. `isSetComplete` in `scoring.ts` als testbare Pure Function.

**Tech Stack:** TypeScript strict, better-sqlite3, Zustand, React.

---

### Task 1: `scoring.ts` — `setTargetScore` + `isSetComplete` (TDD)

**Files:**
- Modify: `src/renderer/lib/scoring.ts` (append)
- Create: `tests/unit/set-completion.test.ts`

- [ ] **Step 1: Failing test schreiben**

```ts
// tests/unit/set-completion.test.ts
import { describe, it, expect } from 'vitest';
import { setTargetScore, isSetComplete } from '@renderer/lib/scoring';

describe('setTargetScore', () => {
  it('returns 25 for sets 1–4', () => {
    expect(setTargetScore(1)).toBe(25);
    expect(setTargetScore(4)).toBe(25);
  });
  it('returns 15 for set 5', () => {
    expect(setTargetScore(5)).toBe(15);
  });
});

describe('isSetComplete', () => {
  it('false at 24:24', () => expect(isSetComplete(24, 24, 1)).toBe(false));
  it('true at 25:23', () => expect(isSetComplete(25, 23, 1)).toBe(true));
  it('false at 25:24 — no 2-point lead', () => expect(isSetComplete(25, 24, 1)).toBe(false));
  it('true at 26:24 — deuce extended', () => expect(isSetComplete(26, 24, 1)).toBe(true));
  it('false at 14:13 set 5', () => expect(isSetComplete(14, 13, 5)).toBe(false));
  it('true at 15:13 set 5', () => expect(isSetComplete(15, 13, 5)).toBe(true));
  it('false at 15:14 set 5 — deuce', () => expect(isSetComplete(15, 14, 5)).toBe(false));
});
```

- [ ] **Step 2: Test ausführen → FAIL**

```
npx vitest run tests/unit/set-completion.test.ts
```
Erwartet: `setTargetScore is not a function`

- [ ] **Step 3: Implementierung an `scoring.ts` anhängen** (nach der letzten Zeile)

```ts
export function setTargetScore(setNumber: number): number {
  return setNumber === 5 ? 15 : 25;
}

export function isSetComplete(homeScore: number, awayScore: number, setNumber: number): boolean {
  const target = setTargetScore(setNumber);
  const hi = Math.max(homeScore, awayScore);
  const lo = Math.min(homeScore, awayScore);
  return hi >= target && hi - lo >= 2;
}
```

- [ ] **Step 4: Test → PASS**

```
npx vitest run tests/unit/set-completion.test.ts
```

- [ ] **Step 5: Commit**

```
git add src/renderer/lib/scoring.ts tests/unit/set-completion.test.ts
git commit -m "feat(scoring): add setTargetScore + isSetComplete (25+2 / 15+2)"
```

---

### Task 2: DB-Migration 002

**Files:**
- Create: `src/main/db/migrations/002_set_lineups.sql`
- Modify: `src/main/db/migrate.ts`

- [ ] **Step 1: Migration schreiben**

```sql
-- src/main/db/migrations/002_set_lineups.sql
ALTER TABLE sets ADD COLUMN home_lineup  TEXT;
ALTER TABLE sets ADD COLUMN away_lineup  TEXT;
ALTER TABLE sets ADD COLUMN serving_team TEXT CHECK(serving_team IN ('home','away',NULL));
```

- [ ] **Step 2: `migrate.ts` — Migration registrieren**

Zeile 2 — Import hinzufügen:
```ts
import migration002 from './migrations/002_set_lineups.sql?raw';
```

Zeile 13 — Array erweitern:
```ts
const migrations = [
  { version: 1, sql: migration001 },
  { version: 2, sql: migration002 },
];
```

- [ ] **Step 3: Commit**

```
git add src/main/db/migrations/002_set_lineups.sql src/main/db/migrate.ts
git commit -m "feat(db): migration 002 — add lineup columns to sets"
```

---

### Task 3: Shared types + IPC channels

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/ipc-channels.ts`

- [ ] **Step 1: `types.ts` — `SetRecord` + `UpsertSetDTO` ergänzen** (nach `LineupSelection` um Zeile 207)

```ts
export interface SetRecord {
  match_id: number;
  set_number: number;
  home_lineup: string | null;   // JSON-Array Trikotnummern Position 1-6
  away_lineup: string | null;
  serving_team: TeamSide | null;
}

export interface UpsertSetDTO {
  matchId: number;
  setNumber: number;
  homeLineup: number[];
  awayLineup: number[];
  servingTeam: TeamSide;
}
```

- [ ] **Step 2: `ipc-channels.ts` — zwei neue Kanäle** (nach `RALLIES_LIST`)

```ts
SET_UPSERT:        'set:upsert',
SETS_FOR_MATCH:    'set:list-for-match',
```

- [ ] **Step 3: Commit**

```
git add src/shared/types.ts src/shared/ipc-channels.ts
git commit -m "feat(shared): add SetRecord, UpsertSetDTO, SET_UPSERT/SETS_FOR_MATCH channels"
```

---

### Task 4: `scouting.repo.ts` — `upsertSet` + `getSetsForMatch`

**Files:**
- Modify: `src/main/db/scouting.repo.ts` (append zwei Funktionen)

- [ ] **Step 1: Zwei Repo-Funktionen anhängen**

```ts
export function upsertSet(db: Database.Database, dto: UpsertSetDTO): void {
  db.prepare(
    `INSERT INTO sets (match_id, set_number, home_score, away_score, home_lineup, away_lineup, serving_team)
     VALUES (@match_id, @set_number, 0, 0, @home_lineup, @away_lineup, @serving_team)
     ON CONFLICT(match_id, set_number) DO UPDATE SET
       home_lineup  = excluded.home_lineup,
       away_lineup  = excluded.away_lineup,
       serving_team = excluded.serving_team`,
  ).run({
    match_id:     dto.matchId,
    set_number:   dto.setNumber,
    home_lineup:  JSON.stringify(dto.homeLineup),
    away_lineup:  JSON.stringify(dto.awayLineup),
    serving_team: dto.servingTeam,
  });
}

export function getSetsForMatch(db: Database.Database, matchId: number): SetRecord[] {
  return db
    .prepare('SELECT * FROM sets WHERE match_id = ? ORDER BY set_number')
    .all(matchId) as SetRecord[];
}
```

Import `SetRecord` + `UpsertSetDTO` am Dateikopf ergänzen.

- [ ] **Step 2: Commit**

```
git add src/main/db/scouting.repo.ts
git commit -m "feat(repo): add upsertSet + getSetsForMatch"
```

---

### Task 5: IPC-Handler + API-Wrapper

**Files:**
- Modify: `src/main/ipc/scouting.ipc.ts`
- Modify: `src/renderer/api/scouting.api.ts`

- [ ] **Step 1: `scouting.ipc.ts` — zwei Handler** (nach `TIMEOUT_CREATE`)

```ts
handle(IPC.SET_UPSERT, (_e, dto: UpsertSetDTO) => repo.upsertSet(getDb(), dto));
handle(IPC.SETS_FOR_MATCH, (_e, { matchId }: { matchId: number }) =>
  repo.getSetsForMatch(getDb(), matchId),
);
```

Import `UpsertSetDTO` ergänzen.

- [ ] **Step 2: `scouting.api.ts` — zwei Methoden** (im `scoutingApi`-Objekt)

```ts
upsertSet: (dto: UpsertSetDTO) =>
  window.ipc.invoke<void>(IPC.SET_UPSERT, dto),
getSetsForMatch: (matchId: number) =>
  window.ipc.invoke<SetRecord[]>(IPC.SETS_FOR_MATCH, { matchId }),
```

Imports `UpsertSetDTO`, `SetRecord` ergänzen.

- [ ] **Step 3: Commit**

```
git add src/main/ipc/scouting.ipc.ts src/renderer/api/scouting.api.ts
git commit -m "feat(ipc): register SET_UPSERT + SETS_FOR_MATCH handlers and API wrappers"
```

---

### Task 6: `scouting.store.ts` — Session-Persistenz

**Files:**
- Modify: `src/renderer/store/scouting.store.ts`

- [ ] **Step 1: Imports ergänzen**

```ts
import { isSetComplete } from '@renderer/lib/scoring';
import type { SetRecord } from '@shared/types';
```

- [ ] **Step 2: Store-Interface** — `setCompleted` + `nextSet` + `startSession`-Signatur anpassen

```ts
interface ScoutingStore {
  // ...bestehende Felder...
  setCompleted: boolean;

  startSession: (matchId: number) => Promise<void>;   // kein setNumber mehr
  setLineup: (selection: LineupSelection) => Promise<void>;
  // rest unverändert
}
```

- [ ] **Step 3: Initialzustand** — `setCompleted: false` ergänzen (Zeile ~66)

- [ ] **Step 4: `startSession` komplett ersetzen**

```ts
startSession: async (matchId) => {
  try {
    const match = await matchesApi.get(matchId);
    const [homeRoster, awayRoster] = await Promise.all([
      rosterApi.get(match.home_team_id),
      rosterApi.get(match.away_team_id),
    ]);

    const allSets = await scoutingApi.getSetsForMatch(matchId);
    const activeSet: SetRecord | undefined = allSets
      .filter((s) => s.serving_team !== null)
      .reduce<SetRecord | undefined>(
        (max, s) => (max === undefined || s.set_number > max.set_number ? s : max),
        undefined,
      );

    const setNumber = activeSet?.set_number ?? 1;
    const rallies = await scoutingApi.listRallies(matchId, setNumber);

    if (activeSet?.home_lineup && activeSet.away_lineup && activeSet.serving_team) {
      const homeLineup = JSON.parse(activeSet.home_lineup) as number[];
      const awayLineup = JSON.parse(activeSet.away_lineup) as number[];
      const servingTeam = activeSet.serving_team;

      const initialState: ScoringState = {
        homeScore: 0, awayScore: 0,
        rotationHome: 1, rotationAway: 1,
        servingTeam,
      };

      let state = initialState;
      for (const rally of rallies) state = reduceRally(rally, state);

      set({
        session: {
          matchId, setNumber,
          homeScore: state.homeScore, awayScore: state.awayScore,
          rotationHome: state.rotationHome, rotationAway: state.rotationAway,
          servingTeam: state.servingTeam,
          homeTeamId: match.home_team_id, awayTeamId: match.away_team_id,
          homeTeamName: match.home_team.name, awayTeamName: match.away_team.name,
          homeRoster, awayRoster,
          homeLineup, awayLineup,
        },
        rallies,
        needsLineup: false,
        initialState,
        setCompleted: isSetComplete(state.homeScore, state.awayScore, setNumber),
        currentInput: '', pendingRally: null, validationErrors: [], error: null,
      });
    } else {
      set({
        session: {
          matchId, setNumber,
          homeScore: 0, awayScore: 0,
          rotationHome: 1, rotationAway: 1,
          servingTeam: 'home',
          homeTeamId: match.home_team_id, awayTeamId: match.away_team_id,
          homeTeamName: match.home_team.name, awayTeamName: match.away_team.name,
          homeRoster, awayRoster,
          homeLineup: [], awayLineup: [],
        },
        rallies: [],
        needsLineup: true,
        initialState: null,
        setCompleted: false,
        currentInput: '', pendingRally: null, validationErrors: [], error: null,
      });
    }
  } catch (e) {
    set({ error: (e as Error).message });
  }
},
```

- [ ] **Step 5: `setLineup` — DB-Write ergänzen**

Nach `if (session === null) return;`, vor `set({...})`:
```ts
void scoutingApi.upsertSet({
  matchId: session.matchId,
  setNumber: session.setNumber,
  homeLineup: selection.homeLineup,
  awayLineup: selection.awayLineup,
  servingTeam: selection.servingTeam,
});
```

- [ ] **Step 6: `submitCode` — `setCompleted` nach Score-Update setzen**

Am Ende des `set({...})` innerhalb von `submitCode` (nach `validationErrors: []`):
```ts
setCompleted: isSetComplete(outcome.homeScore, outcome.awayScore, session.setNumber),
```

- [ ] **Step 7: `nextSet` — `setCompleted` zurücksetzen**

```ts
nextSet: async () => {
  const { session } = get();
  if (session === null) return;
  set({
    session: {
      ...session,
      setNumber: session.setNumber + 1,
      homeScore: 0, awayScore: 0,
      homeLineup: [], awayLineup: [],
    },
    rallies: [],
    currentInput: '', pendingRally: null, validationErrors: [],
    initialState: null,
    needsLineup: true,
    setCompleted: false,
  });
},
```

- [ ] **Step 8: Commit**

```
git add src/renderer/store/scouting.store.ts
git commit -m "feat(scouting): persist lineup on confirm, auto-resume session, detect set completion"
```

---

### Task 7: `ScoutingView.tsx` — Banner + setNumber entfernen

**Files:**
- Modify: `src/renderer/features/scouting/ScoutingView.tsx`

- [ ] **Step 1: Store-Subscriptions ergänzen**

```ts
const setCompleted = useScoutingStore((s) => s.setCompleted);
const nextSet = useScoutingStore((s) => s.nextSet);
```

- [ ] **Step 2: `startSession`-Aufruf — `setNumber` entfernen** (Zeile ~23)

```ts
void useScoutingStore.getState().startSession(matchId);
```

- [ ] **Step 3: Satzende-Banner einbauen**

Direkt nach `<ScoreBoard ... />` und vor dem `<div className="flex flex-1 ...">` einfügen:

```tsx
{setCompleted && session !== null && (
  <div className="flex shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-800/60 px-4 py-2">
    <span className="text-sm font-semibold text-zinc-100">
      Satz {session.setNumber} —{' '}
      {session.homeScore > session.awayScore ? session.homeTeamName : session.awayTeamName}{' '}
      gewinnt {session.homeScore}:{session.awayScore}
    </span>
    <Button onClick={() => void nextSet()}>Nächster Satz</Button>
  </div>
)}
```

`Button` aus `@renderer/components/ui/Button` importieren.

- [ ] **Step 4: Commit**

```
git add src/renderer/features/scouting/ScoutingView.tsx
git commit -m "feat(scouting): show set-complete banner, remove hardcoded set number"
```

---

### Task 8: Commit der untracked Dateien + Verifikation

- [ ] **Step 1: Untracked Dateien commiten** (aus letzter Session)

```
git add src/renderer/features/scouting/CourtZoneDiagram.tsx
git add src/renderer/features/scouting/notation-reference-data.ts
git add src/renderer/features/scouting/NotationReferenceDialog.tsx
git commit -m "feat(scouting): add notation reference dialog with 5 tabs"
```

- [ ] **Step 2: `npx tsc --noEmit -p tsconfig.json` → keine Fehler**

- [ ] **Step 3: `npm test` → grün**

- [ ] **Step 4: `npm run dev` — manuell prüfen:**
  - Spiel öffnen → Lineup-Dialog erscheint (erstes Mal)
  - Aufstellung eingeben → Scouting beginnt
  - App schließen → wieder öffnen → kein Dialog, Rally-Log + Score korrekt wiederhergestellt
  - Codes eingeben bis 25:23 oder ähnlich → Satzende-Banner erscheint
  - „Nächster Satz" → Lineup-Dialog für Satz 2
  - Hilfe-Button (?) in ScoreBoard → Notation-Referenz-Dialog öffnet sich

---

## Self-Review

- **Spec coverage:** Migration ✓ (T2), SET_UPSERT/SETS_FOR_MATCH ✓ (T3+T5), startSession auto-detect ✓ (T6), Rally-Rekonstruktion ✓ (T6 Step 4), setLineup speichert ✓ (T6 Step 5), isSetComplete 25+2/15+2 ✓ (T1), Banner ✓ (T7).
- **Placeholder scan:** Keine TBDs.
- **Type consistency:** `SetRecord.serving_team: TeamSide | null` ↔ `getSetsForMatch` return ↔ `startSession` filter — konsistent. `UpsertSetDTO` ↔ `upsertSet` ↔ `scoutingApi.upsertSet` — konsistent. `isSetComplete` exportiert aus `scoring.ts` ↔ importiert in `scouting.store.ts` — konsistent.
