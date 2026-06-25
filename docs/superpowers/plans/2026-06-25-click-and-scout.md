# Click & Scout Mode — Implementation Plan

**Goal:** Add a click-driven court UI as an alternative scouting input method, selected once per match. Click-mode rallies are assembled into the same text-code grammar code-scouting already uses, then submitted through the unmodified `scouting.store.ts` pipeline — no new scoring/storage/report logic.

**Spec:** `docs/superpowers/specs/2026-06-25-click-and-scout-design.md`

**Architecture recap (verified against current code, not assumed):**
- `scouting.store.ts`'s `setInput(raw)` → `parseCode(raw)` → `pendingRally`; `submitCode()` reads `pendingRally` and pushes it through `computeRallyOutcome()` → `scoutingApi.createRally()`. Click mode only needs to build the same raw string and call these two **unchanged** functions.
- `scoring.ts`'s `determinePointTeam()` only looks at the *last* action's effect (`#` on S/A/B, `=` on anything); there is no auto-inference for other grades — skipped grades just stay absent from the token, exactly like a code-scout omitting the character.
- A single zone digit in a token is parsed into `start_zone` (the parser never back-fills `end_zone` from one digit) — matches the existing documented example `14A#5` (home #14 attack ace, zone 5). Two digits = `start_zone` then `end_zone`, in click order.

**Tech stack:** TypeScript strict, React, Zustand, better-sqlite3. New pure logic is framework-free TS under `renderer/lib/`, TDD-first per project convention.

---

### Task 1: Migration 004 — `scouting_mode` + libero substitution flag

**Files:**
- Create: `src/main/db/migrations/004_click_scout.sql`
- Modify: `src/main/db/migrate.ts`

- [ ] **Step 1: Migration SQL**

```sql
-- src/main/db/migrations/004_click_scout.sql
ALTER TABLE matches ADD COLUMN scouting_mode TEXT NOT NULL DEFAULT 'code'
  CHECK(scouting_mode IN ('code','click'));

ALTER TABLE substitutions ADD COLUMN is_libero INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Register in `migrate.ts`**

```ts
import migration004 from './migrations/004_click_scout.sql?raw';
// ...
const migrations = [
  { version: 1, sql: migration001 },
  { version: 2, sql: migration002 },
  { version: 3, sql: migration003 },
  { version: 4, sql: migration004 },
];
```

- [ ] **Step 3: Commit**

```
git add src/main/db/migrations/004_click_scout.sql src/main/db/migrate.ts
git commit -m "feat(db): migration 004 — matches.scouting_mode + substitutions.is_libero"
```

---

### Task 2: Shared types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: `Match` — add `scouting_mode`** (in the interface, after `dvw_source_file`)

```ts
export interface Match {
  // ...existing fields...
  scouting_mode: 'code' | 'click';
}
```

`CreateMatchDTO = Omit<Match, 'id' | 'created_at'>` already picks this up — no separate edit needed.

- [ ] **Step 2: `ParsedSub` + `CreateSubstitutionDTO` — add `isLibero`**

```ts
export interface ParsedSub {
  team: TeamSide;
  out: number;
  in: number;
  isLibero: boolean;
}

export interface CreateSubstitutionDTO {
  matchId: number;
  setNumber: number;
  afterRally: number;
  team: TeamSide;
  playerOutNum: number;
  playerInNum: number;
  isLibero: boolean;
}
```

- [ ] **Step 3: `ScoutingSession` — add `scoutingMode`**

```ts
export interface ScoutingSession {
  // ...existing fields...
  scoutingMode: 'code' | 'click';
}
```

- [ ] **Step 4: Commit**

```
git add src/shared/types.ts
git commit -m "feat(shared): add scouting_mode and libero-substitution types"
```

---

### Task 3: `code-parser.ts` — libero substitution marker (TDD)

A capital `L` right after `C` marks a libero swap: `CL11:24` (home), `aCL5:8` (away). Purely additive — existing `C11:24` codes are unaffected (`isLibero: false`).

**Files:**
- Modify: `src/renderer/lib/code-parser.ts`
- Modify: `tests/unit/code-parser.test.ts`

- [ ] **Step 1: Update existing sub tests + add libero cases** (`tests/unit/code-parser.test.ts`, replacing the two tests at lines 107-117)

```ts
it('parses a home substitution', () => {
  const result = parseCode('C11:24');
  expect(result.subs).toEqual([{ team: 'home', out: 11, in: 24, isLibero: false }]);
  expect(result.actions).toEqual([]);
});

it('parses an away substitution', () => {
  const result = parseCode('aC5:8');
  expect(result.subs).toEqual([{ team: 'away', out: 5, in: 8, isLibero: false }]);
  expect(result.actions).toEqual([]);
});

it('parses a home libero substitution', () => {
  const result = parseCode('CL11:24');
  expect(result.subs).toEqual([{ team: 'home', out: 11, in: 24, isLibero: true }]);
});

it('parses an away libero substitution', () => {
  const result = parseCode('aCL5:8');
  expect(result.subs).toEqual([{ team: 'away', out: 5, in: 8, isLibero: true }]);
});
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run tests/unit/code-parser.test.ts`)

- [ ] **Step 3: Implement in `code-parser.ts`** — `parseSub` + its call site

```ts
// parseEntry(), replace the SUB block:
if (rest.startsWith('C')) {
  const sub = parseSub(rest.slice(1), team);
  if (sub) rally.subs.push(sub);
  return;
}

// parseSub, replace body:
function parseSub(rest: string, team: TeamSide): ParsedSub | null {
  const isLibero = rest.startsWith('L');
  const body = isLibero ? rest.slice(1) : rest;
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(body);
  if (!match) return null;
  return { team, out: Number(match[1]), in: Number(match[2]), isLibero };
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```
git add src/renderer/lib/code-parser.ts tests/unit/code-parser.test.ts
git commit -m "feat(parser): support CL<out>:<in> libero-substitution marker"
```

---

### Task 4: `code-validator.ts` — fix rawToken reconstruction for the libero marker

`validateRally` rebuilds each sub's raw token to locate it in the input for error positioning. It must include the `L` marker, or position lookup breaks for libero subs.

**Files:**
- Modify: `src/renderer/lib/code-validator.ts`

- [ ] **Step 1: Update token reconstruction** (in `validateRally`, replace the `rawToken` line)

```ts
const rawToken = `${sub.team === 'away' ? 'a' : ''}C${sub.isLibero ? 'L' : ''}${sub.out}:${sub.in}`;
```

- [ ] **Step 2: Commit**

```
git add src/renderer/lib/code-validator.ts
git commit -m "fix(validator): include libero marker when reconstructing sub raw token"
```

---

### Task 5: Thread `isLibero` through repo + store

**Files:**
- Modify: `src/main/db/scouting.repo.ts`
- Modify: `src/renderer/store/scouting.store.ts`

- [ ] **Step 1: `createSubstitution` — write `is_libero`**

```ts
export function createSubstitution(db: Database.Database, dto: CreateSubstitutionDTO): void {
  try {
    db.prepare(
      `INSERT INTO substitutions (match_id, set_number, after_rally, team, player_out_num, player_in_num, is_libero)
       VALUES (@match_id, @set_number, @after_rally, @team, @player_out_num, @player_in_num, @is_libero)`,
    ).run({
      match_id: dto.matchId,
      set_number: dto.setNumber,
      after_rally: dto.afterRally,
      team: dto.team,
      player_out_num: dto.playerOutNum,
      player_in_num: dto.playerInNum,
      is_libero: dto.isLibero ? 1 : 0,
    });
  } catch (e) {
    mapDbError(e, { entity: 'Wechsel' });
  }
}
```

- [ ] **Step 2: `scouting.store.ts` — pass `isLibero` at both call sites of `createSub`**

In `submitCode()`:
```ts
for (const sub of pendingRally.subs) {
  await scoutingApi.createSub({
    matchId: session.matchId,
    setNumber: session.setNumber,
    afterRally: newRally.rally_number,
    team: sub.team,
    playerOutNum: sub.out,
    playerInNum: sub.in,
    isLibero: sub.isLibero,
  });
}
```

In `updateRally()`'s `subs.map(...)` passed to `scoutingApi.updateRally`:
```ts
parsed.subs.map((sub) => ({
  matchId: session.matchId,
  setNumber: session.setNumber,
  afterRally: rally.rally_number,
  team: sub.team,
  playerOutNum: sub.out,
  playerInNum: sub.in,
  isLibero: sub.isLibero,
})),
```

- [ ] **Step 3: Commit**

```
git add src/main/db/scouting.repo.ts src/renderer/store/scouting.store.ts
git commit -m "feat(scouting): persist is_libero flag on substitutions"
```

---

### Task 6: Mode selection at match creation

**Files:**
- Modify: `src/main/db/matches.repo.ts`
- Modify: `src/renderer/features/matches/MatchForm.tsx`
- Modify: `src/renderer/features/matches/MatchList.tsx`

- [ ] **Step 1: `matches.repo.ts` — `createMatch` INSERT includes `scouting_mode`**

```ts
const r = db
  .prepare(
    `INSERT INTO matches
      (season_id, home_team_id, away_team_id, match_date, venue, video_path, video_offset_ms, comment, dvw_source_file, scouting_mode)
     VALUES
      (@season_id, @home_team_id, @away_team_id, @match_date, @venue, @video_path, @video_offset_ms, @comment, @dvw_source_file, @scouting_mode)`,
  )
  .run(dto);
```

(`updateMatch` already builds its SET clause generically from `Object.keys(fields)`, so no change needed there — but mode edits should be blocked in the UI per Step 3 below, not in the repo.)

- [ ] **Step 2: `MatchForm.tsx` — mode toggle**

```tsx
export interface MatchFormValues extends CreateMatchDTO {}

export function emptyMatch(): MatchFormValues {
  return {
    // ...existing fields...
    scouting_mode: 'code',
  };
}

export function matchToForm(m: MatchDetail): MatchFormValues {
  return {
    // ...existing fields...
    scouting_mode: m.scouting_mode,
  };
}
```

Add to the form body (new prop `modeLocked?: boolean` for the edit case):

```tsx
<Field label="Scouting-Modus" required>
  <div className="flex gap-2">
    <Button
      variant={values.scouting_mode === 'code' ? 'primary' : 'secondary'}
      disabled={modeLocked}
      onClick={() => set({ scouting_mode: 'code' })}
    >
      Code-Scouting
    </Button>
    <Button
      variant={values.scouting_mode === 'click' ? 'primary' : 'secondary'}
      disabled={modeLocked}
      onClick={() => set({ scouting_mode: 'click' })}
    >
      Click & Scout
    </Button>
  </div>
  {modeLocked && (
    <p className="mt-1 text-xs text-zinc-500">Modus kann nach Anlage nicht mehr geändert werden.</p>
  )}
</Field>
```

(`Button` import already needed — add `import { Button } from '@renderer/components/ui/Button';`.)

- [ ] **Step 3: `MatchList.tsx` — pass `modeLocked`, copy `scouting_mode` in `openEdit`**

In `openEdit`, add `scouting_mode: detail.scouting_mode,` to the `setForm({...})` object.

Where `<MatchForm .../>` is rendered:
```tsx
<MatchForm values={form} teams={teams} onChange={setForm} modeLocked={editId !== null} />
```

- [ ] **Step 4: Commit**

```
git add src/main/db/matches.repo.ts src/renderer/features/matches/MatchForm.tsx src/renderer/features/matches/MatchList.tsx
git commit -m "feat(matches): add scouting-mode toggle on match creation, locked on edit"
```

---

### Task 7: `ScoutingView.tsx` branches on `scoutingMode`

**Files:**
- Modify: `src/renderer/store/scouting.store.ts`
- Modify: `src/renderer/features/scouting/ScoutingView.tsx`

- [ ] **Step 1: `startSession` — carry `scoutingMode` from `match` into `session`** (both branches of the `if (activeSet?.home_lineup...)` block in `startSession`, add to the `session: {...}` object)

```ts
scoutingMode: match.scouting_mode,
```

- [ ] **Step 2: `ScoutingView.tsx` — render `ClickScoutWindow` instead of `CommandLine` when click mode**

```tsx
import { ClickScoutWindow } from '@renderer/features/scouting/click/ClickScoutWindow';
// ...
<RallyLog />
</div>
{session.scoutingMode === 'click' ? <ClickScoutWindow /> : <CommandLine />}
```

(`ClickScoutWindow` is built in Task 10; this wiring step can be done last, or stubbed with an empty component now and filled in later — either order works since it's a single import + conditional.)

- [ ] **Step 3: Commit** (combine with Task 10 if doing UI in one pass, or commit the stub separately)

```
git add src/renderer/store/scouting.store.ts src/renderer/features/scouting/ScoutingView.tsx
git commit -m "feat(scouting): branch scouting window on match.scouting_mode"
```

---

### Task 8: `click-rally-builder.ts` — core state machine (TDD)

This is the highest-risk new logic: a pure, framework-free state machine that turns discrete click events into the **same raw code string** `code-parser.ts` parses from typed text. It does not touch React, the store, or the DB. Tests are the spec here — write them first, they pin down every branch.

**Files:**
- Create: `src/renderer/lib/click-rally-builder.ts`
- Create: `tests/unit/click-rally-builder.test.ts`

**Public shape:**

```ts
export type ClickStep =
  | { kind: 'SERVE_START' }
  | { kind: 'SERVE_LANDING' }
  | { kind: 'SERVE_GRADE' }
  | { kind: 'RECEPTION'; team: TeamSide }
  | { kind: 'RECEPTION_GRADE' }
  | { kind: 'ATTACK_START'; team: TeamSide }
  | { kind: 'ATTACK_LANDING'; team: TeamSide; player: number }
  | { kind: 'ATTACK_GRADE'; team: TeamSide }
  | { kind: 'BLOCK_TOUCH'; blockingTeam: TeamSide }
  | { kind: 'BLOCK_LANDING'; blockingTeam: TeamSide }
  | { kind: 'BLOCK_GRADE'; blockingTeam: TeamSide }
  | { kind: 'RALLY_DONE'; codeString: string };

export interface ClickRallyBuilder {
  step: ClickStep;
  /** Zone click: serve start/landing, attack start/landing, block touch/landing. */
  clickZone(zone: number, subzone?: 'a' | 'b' | 'c' | 'd'): ClickRallyBuilder;
  /** Out-of-bounds click instead of a zone — resolves the rally immediately. */
  clickOutOfBounds(): ClickRallyBuilder;
  /** Player click: reception, attack, block-attribution. */
  clickPlayer(team: TeamSide, shirtNumber: number): ClickRallyBuilder;
  /** Grade click (#, +, !, -, /, =) — optional at every *_GRADE step except where noted. */
  clickGrade(effect: Effect): ClickRallyBuilder;
  /** Skip the optional grade for the current step. */
  skipGrade(): ClickRallyBuilder;
  /** Serve subtype (H/M/Q) or attack subtype (H/Q/T/U) — optional. */
  clickSubtype(subtype: string): ClickRallyBuilder;
  /** 0/1/2 — only relevant right before BLOCK_TOUCH is reached via ATTACK_GRADE '/' or '!'. */
  clickBlockCount(n: 0 | 1 | 2): ClickRallyBuilder;
}

export function createClickRallyBuilder(servingTeam: TeamSide): ClickRallyBuilder;
```

The builder is **immutable** (each method returns a new `ClickRallyBuilder`) so the React layer can hold it in `useState` without extra wrapping.

**Internal token assembly rule** (from the parser grammar, verified in Task 3's reading of `code-parser.ts`):
`${team==='away'?'a':''}${player}${skill}${subtype??''}${effect??''}${zone1??''}${subzone1??''}${zone2??''}${subzone2??''}`
joined with `.`. A single zone click → `zone1` only (matches `14A#5` convention). Two zone clicks (start then landing) → `zone1` then `zone2`.

**Test list (write these first, in `tests/unit/click-rally-builder.test.ts`):**

1. `serve ace`: `clickZone(1)` → `clickZone(5)` → `clickGrade('#')` → step becomes `RALLY_DONE` with `codeString` matching `parseCode(codeString).pointTeam === 'home'` and a single `S` action with `startZone: 1, endZone: 5, effect: '#'`.
2. `serve error`: `clickZone(1)` → `clickOutOfBounds()` → auto-resolves to `RALLY_DONE`, effect `=`, point to receiving team (assert via `parseCode` + `deriveOutcome`).
3. `serve type selected`: `clickZone(1)` → `clickSubtype('Q')` → `clickZone(5)` → `clickGrade('-')` → reception step reached; resulting action has `skillSubtype: 'Q'`.
4. `full rally, no grades clicked`: serve (skip grade) → reception (`clickPlayer`, skip grade) → attack (`clickPlayer`, `clickZone` landing, `clickGrade('#')`) → `RALLY_DONE`; assert every optional-grade action has `effect: null` except the final `#`.
5. `attack blocked, dig, re-attack, point`: attack `clickGrade('/')` → `BLOCK_TOUCH` → `clickZone` (touch) → `BLOCK_LANDING` → `clickZone` (deflection) → `BLOCK_GRADE` → `clickGrade('!')` (rally continues) → back to `ATTACK_START` for the digging team → ... → eventually `clickGrade('#')` → `RALLY_DONE`. Assert the action sequence order and that `team` alternates correctly across the block/dig/re-attack.
6. `attack with explicit start zone` (back-row player hitting through zone 2): `ATTACK_START` reached only when the builder is told to show it — model this as the caller optionally calling `clickZone` twice in a row before grade (once for start, once for landing); assert resulting action has both `startZone` and `endZone` set.
7. `attack lands out of bounds`: `clickOutOfBounds()` at `ATTACK_LANDING` → immediate `=`, point to defending team.
8. `0/1/2 block count recorded`: `clickBlockCount(1)` before/with the attack's `BLOCK_TOUCH` flow — assert it surfaces in the emitted code (e.g. as the block action's subtype slot, matching whatever encoding Task 8's implementation chooses — pin the exact string in the test once decided, don't leave it ambiguous).
9. `getCodeString round-trips through parseCode`: for every scenario above, `parseCode(step.codeString)` must produce a `ParsedRally` whose `actions` match what a code-scout would have typed for the same rally — this is the contract test that guarantees pipeline reuse.

- [ ] **Step 1: Write the full test file above (all 9 scenarios), run → FAIL**
- [ ] **Step 2: Implement `click-rally-builder.ts`** satisfying the tests one at a time (smallest scenario first: serve ace, then serve error, then full rally, then the block/dig branch). Keep `clickOutOfBounds` and grade/zone bookkeeping as plain object transitions — no DOM, no React, no store import.
- [ ] **Step 3: All tests → PASS** (`npx vitest run tests/unit/click-rally-builder.test.ts`)
- [ ] **Step 4: Commit**

```
git add src/renderer/lib/click-rally-builder.ts tests/unit/click-rally-builder.test.ts
git commit -m "feat(scouting): add click-rally-builder state machine (TDD)"
```

---

### Task 9: `CourtClickArea.tsx` — landscape court component

**Files:**
- Create: `src/renderer/features/scouting/click/CourtClickArea.tsx`

Renders a landscape 9-zone court (reuse the zone layout/geometry from `CourtZoneDiagram.tsx`, rotated to landscape) split into home/away halves, plus:
- an out-of-bounds margin around the whole court — clicking it calls `onOutOfBounds()` instead of a zone
- a serve-start strip behind the serving team's baseline, shown only when `activeZoneArea === 'serve-start'`
- a block strip along the net on the defending side, shown only when `activeZoneArea === 'block'`
- on-court player chips at positions 1-6, computed via the **existing** `shirtAtPosition(lineup, rotation, position)` from `RotationDisplay.tsx` (export it from there, or duplicate the 6-line pure function — prefer exporting and importing to avoid drift) — clickable when `activePlayerSide` is set

Props:
```ts
interface CourtClickAreaProps {
  homeLineup: number[]; awayLineup: number[];
  rotationHome: number; rotationAway: number;
  activeZoneArea: 'serve-start' | 'court' | 'block' | null;
  activePlayerSide: TeamSide | null;
  liberoShirt?: { home: number | null; away: number | null };
  onZoneClick: (zone: number, subzone?: 'a'|'b'|'c'|'d') => void;
  onOutOfBounds: () => void;
  onPlayerClick: (team: TeamSide, shirtNumber: number) => void;
}
```

- [ ] **Step 1: Export `shirtAtPosition` from `RotationDisplay.tsx`** (drop the leading nothing, just add `export` to the existing function declaration)
- [ ] **Step 2: Build `CourtClickArea.tsx`** per the props above, following the project's Tailwind/dark-theme conventions used in `CourtZoneDiagram.tsx` and `RotationDisplay.tsx` (no naked elements, hover/active states on every clickable target, per `CLAUDE.md`'s UI standard)
- [ ] **Step 3: Commit**

```
git add src/renderer/features/scouting/RotationDisplay.tsx src/renderer/features/scouting/click/CourtClickArea.tsx
git commit -m "feat(scouting): add CourtClickArea landscape court component"
```

---

### Task 10: `ClickScoutWindow.tsx` + step button bars

**Files:**
- Create: `src/renderer/features/scouting/click/ClickScoutWindow.tsx`
- Create: `src/renderer/features/scouting/click/EvaluationBar.tsx`
- Create: `src/renderer/features/scouting/click/ServeTypeBar.tsx`
- Create: `src/renderer/features/scouting/click/AttackTypeBar.tsx`
- Create: `src/renderer/features/scouting/click/BlockCountBar.tsx`
- Modify: `src/renderer/features/scouting/ScoutingView.tsx` (replace the stub from Task 7 if one was added)

`ClickScoutWindow`:
- Holds `const [builder, setBuilder] = useState(() => createClickRallyBuilder(session.servingTeam))`, reset to a fresh builder keyed off `session.servingTeam` whenever a rally completes.
- Renders a header bar with prompt text keyed off `builder.step.kind` (a small lookup table: `SERVE_START` → "Klick Aufschlag-Startpunkt", etc.).
- Renders `<CourtClickArea>` wired to `builder.clickZone/clickOutOfBounds/clickPlayer`, each wrapped to call `setBuilder(builder.method(...))`.
- Renders `EvaluationBar` / `ServeTypeBar` / `AttackTypeBar` / `BlockCountBar` conditionally based on `builder.step.kind`, each wired the same way.
- When `builder.step.kind === 'RALLY_DONE'`: calls `useScoutingStore.getState().setInput(builder.step.codeString)` then `await useScoutingStore.getState().submitCode()`, then resets `builder` to a fresh one for the next rally (re-reading `session.servingTeam` from the store, since it changes after a point).

`EvaluationBar`: six buttons (`# + ! - / =`), `onPick(effect: Effect)`, plus a "skip" affordance (matches the manual's optional-grade behavior — most steps don't require a click here at all, so this can just be "no selection needed to proceed", with explicit skip only where the step machine needs to know "the scout chose not to grade this" vs. "still deciding"; resolve based on how Task 8 modeled `skipGrade()`).

`ServeTypeBar` / `AttackTypeBar`: H/M/Q resp. H/Q/T/U buttons, `onPick(subtype: string)`.

`BlockCountBar`: 0/1/2 buttons, `onPick(n: 0|1|2)`.

- [ ] **Step 1: Build the four small bar components** (each is a row of styled buttons over the project's `Button` component, no new primitives needed)
- [ ] **Step 2: Build `ClickScoutWindow.tsx`** wiring everything together per the bullets above
- [ ] **Step 3: `ScoutingView.tsx`** — confirm/finish the Task 7 wiring (`session.scoutingMode === 'click' ? <ClickScoutWindow /> : <CommandLine />`)
- [ ] **Step 4: Commit**

```
git add src/renderer/features/scouting/click/ src/renderer/features/scouting/ScoutingView.tsx
git commit -m "feat(scouting): add ClickScoutWindow and step button bars"
```

---

### Task 11: `SubPanel.tsx` + `LiberoToggle.tsx`

Both reuse the **existing** text pipeline directly — no new store methods. A substitution or libero swap is its own "rally" submission with zero actions, exactly like a code-scout typing `C11:24` alone and pressing Enter (already supported today, confirmed by `submitCode()`'s generic handling of `pendingRally.subs`).

**Files:**
- Create: `src/renderer/features/scouting/click/SubPanel.tsx`
- Create: `src/renderer/features/scouting/click/LiberoToggle.tsx`
- Modify: `src/renderer/features/scouting/click/ClickScoutWindow.tsx` (mount both in a side column)

`SubPanel`: click on-court player chip (via a compact lineup list, not the main court — avoid fighting with `CourtClickArea`'s active-step affordances), then a bench player from `session.homeRoster`/`awayRoster`; on confirm, build `${team==='away'?'a':''}C${out}:${in}` and call `setInput` + `submitCode()` exactly like Task 10's `RALLY_DONE` handler does.

`LiberoToggle`: same flow with the `L` marker (`CL11:24`) per Task 3's grammar extension. Also exposes the "libero receives without swapping in yet" affordance: pass the libero's shirt number as an extra clickable target into `CourtClickArea`'s `liberoShirt` prop during the `RECEPTION` step (no submission involved — it's just an additional valid `clickPlayer` target; the resulting action simply carries the libero's shirt number, identical to any other player click).

- [ ] **Step 1: `SubPanel.tsx`** — on-court/bench picker + submit via `setInput`/`submitCode`
- [ ] **Step 2: `LiberoToggle.tsx`** — same, with `CL` marker; thread `liberoShirt` into `CourtClickArea`
- [ ] **Step 3: Mount both in `ClickScoutWindow.tsx`**
- [ ] **Step 4: Commit**

```
git add src/renderer/features/scouting/click/SubPanel.tsx src/renderer/features/scouting/click/LiberoToggle.tsx src/renderer/features/scouting/click/ClickScoutWindow.tsx
git commit -m "feat(scouting): add substitution panel and libero toggle to click mode"
```

---

### Task 12: Verification

- [ ] **Step 1:** `npx tsc --noEmit -p tsconfig.json` → no errors
- [ ] **Step 2:** `npm test` → all green, including the new `click-rally-builder.test.ts` and updated `code-parser.test.ts`
- [ ] **Step 3:** `npm run dev` — manual pass:
  - Create a new match with "Click & Scout" mode selected → confirm the toggle is gone/disabled on subsequent edit
  - Enter lineup (unchanged dialog) → click-mode window appears instead of `CommandLine`
  - Play through: serve ace, serve error, a full rally with reception/attack/point, a blocked attack with a dig and re-attack, a substitution, a libero swap-in and a libero reception before swap-in
  - Open the match report for this match → confirm stats/charts populate identically to a code-scouted match (no special-casing needed, per the architecture)
  - Switch to a code-scouting match → confirm nothing there regressed (existing `CommandLine`/`RallyLog` flow untouched)

---

## Self-Review

- **Spec coverage:** mode selection (T6), pipeline reuse via `setInput`/`submitCode` (T8/T10/T11, no new store methods), serve/reception/attack/block step flow (T8 test list mirrors the spec's state machine exactly), libero (T3/T4/T5/T11), substitutions (T11), stats/reports (no task needed — explicitly verified unchanged in T12).
- **Placeholder scan:** none; the two spots that defer a concrete choice to implementation time (`EvaluationBar`'s skip affordance, `BlockCountBar`'s exact encoding) are flagged inline as "resolve based on Task 8's `skipGrade()` design" / "pin the exact string in the test" rather than left vague — Task 8 is TDD-first specifically so those decisions get made by a failing test before any UI consumes them.
- **Type consistency:** `ParsedSub.isLibero` ↔ `code-parser.ts` ↔ `code-validator.ts` token rebuild ↔ `scouting.store.ts` ↔ `CreateSubstitutionDTO` ↔ `scouting.repo.ts` insert — traced end to end in T3-T5. `Match.scouting_mode` ↔ `CreateMatchDTO` (via `Omit`) ↔ `matches.repo.ts` INSERT ↔ `MatchForm` ↔ `ScoutingSession.scoutingMode` (T2/T6/T7) — traced end to end.
- **No new DB/IPC surface beyond migration 004**: rallies/actions/subs/timeouts all go through the existing `RALLY_CREATE`/`SUB_CREATE`/`TIMEOUT_CREATE` channels untouched, confirmed by reading `scouting.ipc.ts` (generic passthrough, no per-field marshalling to update).
