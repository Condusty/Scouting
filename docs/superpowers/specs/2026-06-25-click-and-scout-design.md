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

The single most important architectural decision: **the click UI never talks to the database or scoring logic directly.** It only builds the same `ParsedAction[]` / `ParsedRally` shape that `code-parser.ts` already produces from text, then hands that object to the *existing* `computeRallyOutcome()` → rally/action insert → cascade-recalc pipeline used by code scouting. Concretely:

- New pure-logic module `renderer/lib/click-rally-builder.ts`. This is a state machine, framework-free TS (no React), unit-tested like `code-parser.ts` — TDD-first, per project convention, since it is the highest-risk new logic.
- Input: a sequence of discrete click events (`{ kind: 'zone-click' | 'player-click' | 'effect-click' | 'subtype-click' | 'sub' | 'timeout', ...payload }`).
- Output: incrementally-built `ParsedAction` objects (team, player_number, skill, skill_subtype, start_zone, start_subzone, end_zone, end_subzone, effect), exactly mirroring the fields `code-parser.ts` fills in from text tokens.
- Effect inference reuses the same compound-codification relationship already implicit in `scoring.ts`/the parser's optional `EFFECT` grammar token: most grades are optional and inferred once the *next* action arrives (serve `-` because reception was `#`, etc.); only point-ending grades (`#`, `=`) must be explicit because no follow-up action exists to infer them from. No new effect tables — same rules, just triggered by clicks instead of typed characters.
- Once a rally completes (point scored), the builder emits a complete `ParsedRally`, which flows into the same `computeRallyOutcome()` / `insertActions()` code path code-scouting's `submitCode()` already uses in `scoring.store.ts`. Auto-rotation, auto-serving-team, and score tracking are therefore unchanged — zero new logic.
- `MatchReportView`, `stats-engine.ts`, `buildMatchReport`, `PlayerStats`, etc. require **no changes**: they read `actions`/`rallies` rows, agnostic to how those rows were produced.

## 3. New UI components

Under `renderer/features/scouting/click/`:

- `ClickScoutWindow.tsx` — the click-mode equivalent of `CommandLine` + `RallyLog`, mounted instead of them when `scoutingMode === 'click'`. Hosts a persistent header bar showing the current step's prompt (e.g. "Klick Annahmespieler", "Klick Aufschlag-Startpunkt") driven by `click-rally-builder`'s current state.
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
