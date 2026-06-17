# Notation-Korrektur (Z/I, Serve-Types, Effekt-Labels) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Phase-1 notation grammar with the real VolleyStation manual: rename the rotation-override token `Z`→`I`, remove the invented sideswitch code (`I<1|2>` / `sideSwitch` / `currentSide`), correct the serve-type set to `{Q,H,M,T}`, and make effect labels (`# + ! - / =`) skill-specific.

**Architecture:** Surgical edits across the parser (`code-parser.ts`), shared types, the scouting store, scoring comments, and the rally-preview label maps, plus matching test updates and two doc updates (`phase-1-design.md`, `WORKFLOW.md`). No DB schema/migration changes — `sideSwitch`/`currentSide` were never persisted. One commit at the end for the whole correction (it's a single coherent rename/cleanup, not independent features).

**Tech Stack:** TypeScript (strict), Vitest.

**Note on convention:** Per user request, this plan skips full code blocks. Each step gives exact file:line locations and precise before/after snippets — write the surrounding code/imports as needed to keep the file compiling. Spec/contract: `docs/superpowers/specs/2026-06-15-notation-correction-design.md`.

---

### Task 1: `code-parser.ts` — serve types, rotation token rename, remove sideswitch

**Files:**
- Modify: `src/renderer/lib/code-parser.ts`

- [ ] **Step 1: Update `SERVE_TYPES`**

Line 4:
```
const SERVE_TYPES = new Set(['Q', 'M', 'T']);
```
→
```
const SERVE_TYPES = new Set(['Q', 'H', 'M', 'T']);
```

- [ ] **Step 2: Remove `sideSwitch` from `emptyRally`**

Line 14, delete:
```
    sideSwitch: null,
```

- [ ] **Step 3: Rename ROTATION token `Z`→`I`**

Lines 61-62:
```
  // ROTATION := 'Z' DIGIT
  if (trimmed[0] === 'Z') {
```
→
```
  // ROTATION := 'I' DIGIT
  if (trimmed[0] === 'I') {
```
The regex `/^[1-6]$/` on line 64 and the rest of the block stay unchanged.

- [ ] **Step 4: Remove the SIDESWITCH branch entirely**

Delete lines 70-77 (the whole `// SIDESWITCH := 'I' ('1'|'2')` block, now dead since `I` is claimed by ROTATION):
```
  // SIDESWITCH := 'I' ('1'|'2')
  if (trimmed[0] === 'I') {
    const digit = trimmed.slice(1);
    if (digit === '1' || digit === '2') {
      rally.sideSwitch = digit === '1' ? 1 : 2;
    }
    return;
  }

```

- [ ] **Step 5: Fix SERVETYPE comment**

Line 117:
```
  // SERVETYPE := 'Q'|'M'|'T' (only after S)
```
→
```
  // SERVETYPE := 'Q'|'H'|'M'|'T' (only after S)
```

- [ ] **Step 6: Do not run tests yet**

`shared/types.ts` (Task 2) still declares `sideSwitch` as a required field, so `emptyRally`'s return type check would fail in isolation. Tasks 1+2 together restore a compiling state — proceed to Task 2 before running `npx tsc --noEmit`.

---

### Task 2: `shared/types.ts` — remove `sideSwitch` and `currentSide`

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Remove `ParsedRally.sideSwitch`**

Line 174, delete:
```
  sideSwitch: 1 | 2 | null;
```

- [ ] **Step 2: Remove `ScoutingSession.currentSide`**

Lines 201-202, delete:
```
  /** Court side (1|2), set via the 'I1'/'I2' sideswitch code. */
  currentSide: 1 | 2;
```

- [ ] **Step 3: Quick compile check**

Run: `npx tsc --noEmit`
Expected: errors only in `scouting.store.ts` and `rally-preview.ts` (still reference `sideSwitch`/`currentSide` — fixed in Tasks 3 and 5). No errors in `code-parser.ts` or its test file yet (test file still has stale assertions — fixed in Task 6).

---

### Task 3: `scouting.store.ts` — remove all `currentSide`/`sideSwitch` references

**Files:**
- Modify: `src/renderer/store/scouting.store.ts`

- [ ] **Step 1: Fix `reduceRally` JSDoc and literal**

Line 41:
```
 * Manual `Z` rotation overrides applied at submit-time aren't replayed here -
```
→
```
 * Manual `I` rotation overrides applied at submit-time aren't replayed here -
```

Line 52, delete:
```
      sideSwitch: null,
```

- [ ] **Step 2: `startSession` — remove `currentSide: 1`**

Line 97, delete:
```
          currentSide: 1,
```

- [ ] **Step 3: `submitCode` — remove `currentSide` calc and field**

Line 197, delete:
```
      const currentSide = pendingRally.sideSwitch !== null ? pendingRally.sideSwitch : session.currentSide;

```
(including the blank line after it)

Line 208, delete:
```
          currentSide,
```

- [ ] **Step 4: `updateRally` — remove `currentSide` recompute loop and field**

Lines 301-306, delete:
```
      let currentSide: 1 | 2 = 1;
      for (let i = 0; i < newRallies.length; i++) {
        const sideSwitch =
          i === index ? parsed.sideSwitch : parseCode(newRallies[i].raw_input ?? '').sideSwitch;
        if (sideSwitch !== null) currentSide = sideSwitch;
      }

```

Line 317, delete:
```
          currentSide,
```

- [ ] **Step 5: `undoLastRally` — remove `currentSide` tracking**

Line 341, delete:
```
    let currentSide: 1 | 2 = 1;
```

Lines 343-345:
```
    for (const rally of remaining) {
      acc = reduceRally(rally, acc);
      const parsed = parseCode(rally.raw_input ?? '');
      if (parsed.sideSwitch !== null) currentSide = parsed.sideSwitch;
    }
```
→
```
    for (const rally of remaining) {
      acc = reduceRally(rally, acc);
    }
```

Line 357, delete:
```
        currentSide,
```

- [ ] **Step 6: `nextSet` — remove `currentSide: 1`**

Line 375, delete:
```
        currentSide: 1,
```

- [ ] **Step 7: Compile check**

Run: `npx tsc --noEmit`
Expected: errors remain only in `rally-preview.ts` (Task 5) and stale test files (Tasks 6-8).

---

### Task 4: `scoring.ts` — comment fix only

**Files:**
- Modify: `src/renderer/lib/scoring.ts`

- [ ] **Step 1: Fix `computeRallyOutcome` JSDoc**

Line 60:
```
 * `deriveOutcome` plus the manual rotation override (`Z<n>`): overwrites the
```
→
```
 * `deriveOutcome` plus the manual rotation override (`I<n>`): overwrites the
```

No logic change — `rotationSet` (internal field name) and the override logic (lines 68-74) stay as-is.

---

### Task 5: `rally-preview.ts` — skill-specific effect labels, remove sideswitch description

**Files:**
- Modify: `src/renderer/features/scouting/rally-preview.ts`

- [ ] **Step 1: Replace `EFFECT_LABELS` with skill-specific table + generic fallback**

Replace lines 13-20:
```ts
export const EFFECT_LABELS: Record<Effect, string> = {
  '#': 'perfekt',
  '+': 'positiv',
  '!': 'neutral',
  '-': 'negativ',
  '/': 'Overpass',
  '=': 'Fehler',
};
```
with two maps: `EFFECT_LABELS_GENERIC` (the existing generic table, used as fallback for skills `A` and `E` and for any gap) and `EFFECT_LABELS_BY_SKILL` (skill-specific overrides for `S`, `R`, `B`, `D`, per the design doc's confirmed table). Type: `Record<Skill, Partial<Record<Effect, string>>>` for the by-skill map (only `S`/`R`/`B`/`D` keys populated; `A`/`E` map to `{}` or are simply absent and fall through).

Label content (from `docs/superpowers/specs/2026-06-15-notation-correction-design.md` §4 table):

| Symbol | S (Serve) | R (Reception) | B (Block) | D (Dig) |
|---|---|---|---|---|
| `#` | Ass | perfekt (4) | Stuff/Punkt | Gegenangriff möglich |
| `+` | Annahme schwer, keine Kombination | gut (3) | berührt, Gegenangriff möglich | Gegenangriff möglich |
| `!` | Annahme auf 3m-Linie | 3m-Linie (2) | Gegner deckt & greift erneut an | *(kein Eintrag — generic fallback)* |
| `-` | Annahme leicht, Kombination möglich | schwach (1) | *(kein Eintrag — generic fallback)* | *(kein Eintrag — generic fallback)* |
| `/` | Rückschlag ins eigene Feld | Overpass (0.5) | Netzfehler | Ball zurück zum Angreifer |
| `=` | Fehler | Fehler (0) | Block-Out | Fehler/Punktverlust |

`EFFECT_LABELS_GENERIC` keeps the original values (used for `A`, `E`, and the cells marked "generic fallback" above):
```
# → perfekt, + → positiv, ! → neutral, - → negativ, / → Weiterspiel, = → Fehler
```

- [ ] **Step 2: Update `describeAction` to use skill-specific lookup with fallback**

Line 31, replace:
```ts
    parts.push(`(${EFFECT_LABELS[action.effect]})`);
```
with a lookup that tries `EFFECT_LABELS_BY_SKILL[action.skill]?.[action.effect]` first, falling back to `EFFECT_LABELS_GENERIC[action.effect]` if undefined.

- [ ] **Step 3: Remove the sideswitch description block**

Lines 70-72, delete:
```ts
  if (rally.sideSwitch !== null) {
    parts.push(`Seitenwechsel → Seite ${rally.sideSwitch}`);
  }

```

- [ ] **Step 4: Compile check**

Run: `npx tsc --noEmit`
Expected: no errors in production source (`src/`). Remaining errors, if any, are in test files (Tasks 6-8).

---

### Task 6: `tests/unit/code-parser.test.ts` — rotation rename, drop sideswitch test, add `H` serve-type test

**Files:**
- Modify: `tests/unit/code-parser.test.ts`

- [ ] **Step 1: Remove `sideSwitch` assertion from the first test**

Line 23, delete:
```
    expect(result.sideSwitch).toBeNull();
```
(test `'parses a full action with team, subtype, effect and zones'`, lines 5-24)

- [ ] **Step 2: Rename rotation-set test input `Z3`→`I3`**

Lines 114-117:
```ts
  it('parses a rotation set', () => {
    const result = parseCode('Z3');
    expect(result.rotationSet).toBe(3);
  });
```
→
```ts
  it('parses a rotation set', () => {
    const result = parseCode('I3');
    expect(result.rotationSet).toBe(3);
  });
```

- [ ] **Step 3: Remove the side-switch test entirely**

Lines 119-122, delete:
```ts
  it('parses a side switch', () => {
    const result = parseCode('I2');
    expect(result.sideSwitch).toBe(2);
  });

```

- [ ] **Step 4: Remove `sideSwitch: null` from the empty-string expectation**

Lines 124-135, in the `toEqual` object remove the line:
```
      sideSwitch: null,
```
(test `'returns an empty ParsedRally for an empty string'`)

- [ ] **Step 5: Remove `sideSwitch` assertion from the whitespace test**

In `'returns an empty ParsedRally for whitespace-only input'` (was lines 137-146), delete:
```
    expect(result.sideSwitch).toBeNull();
```

- [ ] **Step 6: Add a new test for the `H` (float serve) subtype**

Add near the existing serve-subtype coverage (e.g. after the `'parses a full action...'` test, around line 25). Pattern matches the existing `skillSubtype: 'Q'` case (line 13) but with `H`:
```ts
  it('parses a float serve subtype (H)', () => {
    const result = parseCode('14SH');
    expect(result.actions[0]).toEqual({
      team: 'home',
      playerNumber: 14,
      skill: 'S',
      skillSubtype: 'H',
      startZone: null,
      endZone: null,
      effect: null,
      rawToken: '14SH',
    });
  });
```

- [ ] **Step 7: Run the parser test file**

Run: `npx vitest run tests/unit/code-parser.test.ts`
Expected: all tests PASS.

---

### Task 7: `tests/unit/scoring.test.ts` — drop `sideSwitch` from `makeRally` helper

**Files:**
- Modify: `tests/unit/scoring.test.ts`

- [ ] **Step 1: Remove `sideSwitch: null` from `makeRally`**

Line 26, delete:
```
    sideSwitch: null,
```
(inside `makeRally`, lines 19-30)

No other changes — `rotationSet` is the internal field name (unchanged) and the `computeRallyOutcome` tests (lines ~180-225) build `ParsedRally` objects directly via `makeRally({ rotationSet: ... })`, not via `parseCode`, so the `Z`→`I` token rename doesn't affect them.

- [ ] **Step 2: Run the scoring test file**

Run: `npx vitest run tests/unit/scoring.test.ts`
Expected: all tests PASS.

---

### Task 8: `tests/unit/code-validator.test.ts` — drop `currentSide` from `makeSession` helper

**Files:**
- Modify: `tests/unit/code-validator.test.ts`

- [ ] **Step 1: Remove `currentSide: 1` from `makeSession`**

Line 41, delete:
```
    currentSide: 1,
```
(inside `makeSession()`, lines 20-43)

- [ ] **Step 2: Run the validator test file**

Run: `npx vitest run tests/unit/code-validator.test.ts`
Expected: all tests PASS.

---

### Task 9: `docs/superpowers/specs/2026-06-12-phase-1-design.md` — update EBNF and effect table

**Files:**
- Modify: `docs/superpowers/specs/2026-06-12-phase-1-design.md`

- [ ] **Step 1: Update the EBNF block (lines 96-111)**

Within the fenced block:
- Line 98 `ENTRY := ACTION | SUB | TIMEOUT | POINT | ROTATION | SIDESWITCH` → remove `| SIDESWITCH`
- Line 103 `SERVETYPE := 'Q'|'M'|'T'  ; nur nach S: Q=Sprung, M=Flatter, T=Sprungflatter` →
  `SERVETYPE := 'Q'|'H'|'M'|'T'  ; nur nach S: Q=Sprungaufschlag, H=Flatteraufschlag, M=Sprungflatterer, T=Antäuschen Flatter→Sprungaufschlag`
- Line 109 `ROTATION := 'Z' DIGIT  ; Setter-Rotation 1–6 setzen` → `ROTATION := 'I' DIGIT  ; Rotation 1–6 des Teams setzen`
- Line 110 `SIDESWITCH := 'I' ('1'|'2')  ; Seite 1/2` → delete entirely

- [ ] **Step 2: Add a skill-specific effect table after the EBNF block**

After line 116 (the EBNF examples), add a new subsection with the effect table from the design doc (same table as Task 5 Step 1), plus a note: "Attack (A) und Set (E) nutzen die generischen Labels (`# perfekt, + positiv, ! neutral, - negativ, / Weiterspiel, = Fehler`) — Bedeutungen für diese beiden Skills sind im Manual nicht dokumentiert (nicht verifiziert)."

- [ ] **Step 3: Fix the rotation override reference in §"Auto-Scoring + Auto-Rotation"**

Line 123:
```
  um 1 Position. `Z` überschreibt manuell.
```
→
```
  um 1 Position. `I` überschreibt manuell.
```

---

### Task 10: `WORKFLOW.md` — remove the "Seitenwechsel" checklist item

**Files:**
- Modify: `WORKFLOW.md`

- [ ] **Step 1: Remove line 139**

Delete:
```
- [ ] Seitenwechsel (Z1 / I2)
```

(based on the incorrect premise that `Z1`/`I2` are side-switch codes — corrected per `docs/superpowers/specs/2026-06-15-notation-correction-design.md`)

---

### Task 11: Full verification and commit

**Files:** none (verification + commit only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npx vitest run`
Expected: all tests PASS (no `sideSwitch`/`currentSide`/`Z`-rotation references remain anywhere).

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/lib/code-parser.ts src/shared/types.ts src/renderer/store/scouting.store.ts src/renderer/lib/scoring.ts src/renderer/features/scouting/rally-preview.ts tests/unit/code-parser.test.ts tests/unit/scoring.test.ts tests/unit/code-validator.test.ts docs/superpowers/specs/2026-06-12-phase-1-design.md WORKFLOW.md
git commit -m "fix(scouting): correct notation grammar (I rotation, drop sideswitch, H serve, skill-specific effects)

Phase-1 grammar diverged from the real VolleyStation manual: rotation
override was Z instead of I, an invented I<1|2> sideswitch code/state
(sideSwitch/currentSide) didn't exist in the manual, the serve-type set
was missing H (float) and mislabeled M/T, and effect symbols (# + ! - / =)
have skill-specific meanings the app treated as generic.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
