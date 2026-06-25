# Click & Scout Mode — Design

## Goal

Add a second scouting input method, modeled closely on DataProject's **Click&Scout** software, alongside the existing text-code scouting ("code scouting"). The user picks click-mode or code-mode once per match. Click-mode lets the scout enter every rally by tapping/clicking a volleyball court (landscape) instead of typing codes, while reusing the exact same underlying data model, scoring logic, and reports as code scouting.

## Non-goals

- No changes to code scouting itself.
- No DVW import/export changes.
- No beach volleyball variant (indoor only, matching the rest of the app's current scope).
- No video sync (out of scope for this phase, as in the existing roadmap).

## 1. Mode selection & data model

- New column `matches.scouting_mode TEXT NOT NULL CHECK(scouting_mode IN ('code','click')) DEFAULT 'code'`, set once when the match is created (toggle shown between the "New Match" info dialog and roster entry). Immutable once any rally exists for the match.
- New column `substitutions.is_libero INTEGER NOT NULL DEFAULT 0` — a libero swap is recorded as a normal substitution row but flagged so it is excluded from the per-set substitution-count limit and rendered distinctly in `RallyLog`/code history.
- Both added in a new sequential migration, e.g. `main/db/migrations/004_click_scout.sql`. `001_initial.sql` is never touched.
- `src/shared/types.ts`: extend `Match`/`MatchInput`-equivalent types with `scoutingMode: 'code' | 'click'`, and `Substitution` with `isLibero: boolean`.

## 2. Pipeline reuse architecture

The single most important architectural decision: **the click UI never talks to the database, scoring, or validation logic directly — it drives the existing `scouting.store.ts` text pipeline.**

Verified in the current code: `scouting.store.ts`'s `setInput(raw)` runs `parseCode(raw)` into `pendingRally`/runs `validateRally`, and `submitCode()` reads that `pendingRally` and pushes it through `computeRallyOutcome()` → `scoutingApi.createRally()` (→ `insertActions()` in `scouting.repo.ts`, cascade-recalc on edit). None of that cares how the string was produced.

So the click UI's only job is to **assemble the same raw code string** a scout would have typed (e.g. `14SQ-15.a1RH+.a1AH#`), token by token, as clicks come in, then call the *unmodified* `setInput(codeString)` followed by `submitCode()` once the rally ends. This means:

- New pure-logic module `renderer/lib/click-rally-builder.ts` — a state machine, framework-free TS (no React), unit-tested like `code-parser.ts` (TDD-first, per project convention, since it's the highest-risk new logic).
- Input: discrete click events (zone click w/ optional subzone, player click, effect click, subtype click).
- Output: the same token grammar `code-parser.ts` already parses (`TEAM? PLAYER SKILL SUBTYPE? EFFECT? ZONE[SUBZONE][ZONE[SUBZONE]]`), joined with `.`. The builder never constructs `ParsedAction` objects itself — it emits text, and `parseCode()` (already exhaustively tested) is the single source of truth for turning that text into actions.
- **Correction from an earlier draft:** there is no "compound codification" auto-inference in this codebase today — `scoring.ts`'s `determinePointTeam()` only inspects the *last* action's effect (`#` on S/A/B ends the rally for that team, `=` on any skill ends it for the opponent); all other grades are optional and stay `null` if skipped, exactly like typing a code with no effect character. The click UI's "optional grade" steps therefore just mean: clicking a grade button appends that effect character to the current token; skipping it leaves the token without one. Only `#`/`=` need to be explicit when they apply, because there is no following token to fall back on.
- Because submission goes through the unchanged `setInput`/`submitCode`, click-entered rallies get `validateRally()`, the `RallyLog` display, and the existing "modify code" edit flow for free — they are indistinguishable from code-scouted rallies once stored.
- `MatchReportView`, `stats-engine.ts`, `buildMatchReport`, `PlayerStats`, etc. require **no changes**: they read `actions`/`rallies` rows, agnostic to how those rows were produced.

## 3. New UI components

Under `renderer/features/scouting/click/`:

- `ClickScoutWindow.tsx` — the click-mode equivalent of `CommandLine` (RallyLog stays mounted as-is), shown instead of it when `scoutingMode === 'click'`. Hosts a persistent header bar showing the current step's prompt (e.g. "Klick Annahmespieler", "Klick Aufschlag-Startpunkt") driven by `click-rally-builder`'s current state. On rally completion, calls the unmodified `useScoutingStore.getState().setInput(codeString)` followed by `submitCode()` — no new store methods.
- `CourtClickArea.tsx` — landscape court SVG/div-grid rendering zones 1–9 with a–d subzones (reuses the existing zone/subzone geometry from `CourtZoneDiagram.tsx`), plus:
  - a serve-start strip behind the serving team's baseline (active only during `SERVE_START`)
  - an out-of-bounds margin around the playing field; clicks there auto-resolve to an error/ace effect instead of a zone
  - a block-area strip along the net on the defending side (active only during `BLOCK_AREA`/`BLOCK_TOUCH`)
- `EvaluationBar.tsx` — the `# + ! - / =` grade buttons, shared across serve/reception/attack/block steps (default highlight follows the builder's inferred suggestion, like Click&Scout's yellow highlight).
- `ServeTypeBar.tsx` — H/M/Q serve subtype buttons (floating / jump-float / jump).
- `AttackTypeBar.tsx` — H/Q/T/U attack subtype buttons (high/quick/tense/super); auto-forced to Q for middle-blocker attacks, matching existing code-scouting default-attack-type convention.
- `BlockCountBar.tsx` — 0/1/2 blocking-players buttons.
- `SubPanel.tsx` — side "SUB" button; click on-court player then bench player; writes via existing `SUB_CREATE` IPC (unchanged), `isLibero: false`.
- `LiberoToggle.tsx` — click the libero box, then the on-court player to swap with; writes a substitution row with `isLibero: true`. Reachable mid-rally before the libero's reception, mirroring the manual's "scout libero reception when not yet swapped in" behavior — clicking the libero number at the side of the court records the reception under the libero without performing the swap UI, then prompts to confirm the swap for subsequent rallies.

## 4. Step state machine

```
START_RALLY
  → SERVE_START        (click serve-start strip; sets start_zone/subzone)
  → SERVE_LANDING       (click court; sets end_zone/subzone)
                         out-of-bounds click → effect '=' (ace against server) → POINT_OPPONENT → SERVE_START
  → SERVE_GRADE         (optional: # ! + - / =)
                         '#' or '=' → POINT → SERVE_START
                         else       → RECEPTION
  → RECEPTION           (click receiving player; players auto-positioned per reception scheme;
                         libero box clickable here per LiberoToggle behavior above)
  → RECEPTION_GRADE     (optional; default inferred from serve grade via existing compound table)
  → ATTACK_START         (optional — only shown when the hitter's attack zone differs from their
                         current lineup position, e.g. a back-row player attacking through zone 2/3/4)
  → ATTACK_LANDING       (click landing point)
                         out-of-bounds → effect '=' → POINT_OPPONENT → SERVE_START
                         uncontested landing in opponent court → effect '#' (suggested, overridable)
  → ATTACK_GRADE         (optional # + ! - / =)
                         '/' or '!' (blocked) → BLOCK_AREA
                         else → POINT or loop to ATTACK_START for the next touch
  → BLOCK_AREA → BLOCK_TOUCH    (click point along the net; nearest front-row defender suggested as blocker)
                → BLOCK_LANDING (click deflection landing point)
                → BLOCK_GRADE   (# = / ! + -; optional kill/error-block player attribution,
                                 following the existing "Scout Player kill/error Blocks" options)
  → loop back to ATTACK_START until a rally-ending effect is reached
POINT → score/rotation/serving-team auto-update (scoring.ts, unchanged) → SERVE_START for next rally
```

`TO` (timeout) and `SUB`/libero side actions are usable between any two steps without interrupting the active rally's state.

## 5. Testing

- `click-rally-builder.test.ts` (TDD-first): drive the state machine through click-event sequences for every branch above (ace, error, normal rally with multiple attack/dig loops, blocked attack with kill/error attribution, libero reception before swap-in) and assert the emitted `ParsedRally` matches what `code-parser.ts` would produce from the equivalent text code. This is the contract that guarantees pipeline reuse actually works.
- Existing `code-parser.test.ts`, `scoring.test.ts`, `stats-engine.test.ts` are unaffected and serve as the ground truth the builder's output is compared against.
- Component-level interaction (clicking through `CourtClickArea`) is exercised via Playwright E2E, consistent with how the rest of the renderer is tested.
