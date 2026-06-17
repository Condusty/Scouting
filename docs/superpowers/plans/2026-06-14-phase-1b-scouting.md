# Phase 1b: Live-Scouting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No-code convention:** Dieser Plan beschreibt *was* jede Datei/jeder Schritt tut, ohne Implementierungscode. Funktions-Signaturen und Testfälle (Input→Erwartung) sind als Vertrag angegeben — der ausführende Entwickler schreibt den Code. TDD-Reihenfolge (Test zuerst) ist bei den Pure-Logic-Kernen verpflichtend.

**Goal:** Ein Volleyball-Satz live per Tastatur erfassbar — Code-Eingabe wird geparst, validiert, automatisch verpunktet/rotiert und transaktional in `rallies` + `actions` persistiert; RallyLog, ScoreBoard und Rotation aktualisieren live; Undo funktioniert.

**Architecture:** Drei framework-freie Pure-Logic-Kerne in `src/renderer/lib/` (`code-parser`, `code-validator`, `scoring`) — TDD-first, isoliert unit-getestet. Persistenz über einen transaktionalen Repo-Seam `src/main/db/scouting.repo.ts` (wie 1a-Repos), dünne IPC-Handler in `scouting.ipc.ts` über den `handle()`-Wrapper. Renderer: `scouting.store.ts` (Zustand) orchestriert Parse→Validate→Score→IPC; React-Komponenten unter `features/scouting/` rendern nur. Match-Start öffnet einen `LineupDialog`, der den Anfangszustand in den Store schreibt.

**Tech Stack:** Electron, better-sqlite3, React 19, Zustand, Tailwind v4, lucide-react, Vitest.

**Branch:** von `main` abzweigen (1a ist gemerged: PR #2, commit `1459e7c`).

**Abhängigkeit von 1a (vorhanden in `main`):** `handle()` (`src/main/ipc/handle.ts`), `mapDbError()` (`src/main/db/errors.ts`), UI-Primitiven (`components/ui/*`: Button, Field/Input/Select, Dialog, ConfirmDialog, DataTable, EmptyState, Page), `matches.repo`/`matches.store`/`matches.api`/`MatchList`/`MatchDetail`, `roster.repo`/`roster.store`/`roster.api` (`rosterApi.get(teamId): TeamPlayer[]`), `players`/`teams` Stores, `features/layout/TabContent.tsx` (Tab-Typ→Screen-Router), `ui.store.ts` (`TabType`, `openTab`).

**Namens-Hinweis:** der Team-Typ in `shared/types.ts` heißt `TeamSide` (`'home' | 'away'`), nicht `Team`. Alle neuen Typen unten verwenden `TeamSide`.

**Scope-Notes (bewusst raus, Phase 2):** Freeball `F`, Subzonen A–D, Setter-Calls `K`, Angriffskombinationen, Custom-/Default-Codes, Shift+Enter-Override für ungültige Codes, `action:insert`, Video-Timestamps, DVW. Schema-Felder dafür bleiben ungenutzt.

**Notation (Phase-1-Subset):** Quelle ist die EBNF in `docs/superpowers/specs/2026-06-12-phase-1-design.md` §3. Bei Konflikt mit der älteren Grammatik in `docs/specs/tech-spec.md` gilt das Design-Doc. Zusammenfassung:

- `TEAM` = `*`/leer (Heim) | `a` (Gast)
- `ACTION` = `TEAM? PLAYER(1–2 Ziffern) SKILL SERVETYPE? EFFECT? ZONES?`
- `SKILL` ∈ `S R A B D E`; `SERVETYPE` ∈ `Q M T` (nur nach `S`); `EFFECT` ∈ `# + ! - / =`; `ZONES` = Startzone + optional Endzone (Ziffern 1–9)
- `RALLY` = `ENTRY ('.' ENTRY)*` — `.` = Verbund (z.B. Angriff.Block)
- Sonder-ENTRYs: `SUB` = `TEAM? C raus:rein` (z.B. `C11:24`); `TIMEOUT` = `TEAM? T`; `POINT` = `P` (Heim) | `Pa` (Gast); `ROTATION` = `Z` + Ziffer 1–6; `SIDESWITCH` = `I` + `1`|`2`
- Beispiele: `a10SQ#15` (Gast #10 Sprungaufschlag Ass Zone 1→5) · `7R#1` (Heim #7 Annahme perfekt Zone 1) · `14A#5.a3B=` (Heim #14 Angriff perfekt Zone 5 . Gast #3 Block Fehler)

---

## File Map

| Datei | Verantwortung |
|------|------|
| `src/shared/types.ts` (modify) | + `ParsedAction`, `ParsedRally`, `ScoutingValidationError`, `ScoutingSession`, `ScoringState`, `RallyOutcome` |
| `src/renderer/lib/code-parser.ts` | `parseCode(raw): ParsedRally` — reine Grammatik-Zerlegung |
| `src/renderer/lib/code-validator.ts` | `validateRally(parsed, session): ScoutingValidationError[]` |
| `src/renderer/lib/scoring.ts` | `deriveOutcome(parsed, state): RallyOutcome` — Punkt + Rotation + Side-out |
| `src/main/db/scouting.repo.ts` | Transaktionales create/delete rally+actions, sub, timeout, list, Trikot→player_id |
| `src/main/ipc/scouting.ipc.ts` | IPC-Handler (rally/action/sub/timeout) über `handle()` |
| `src/main/ipc/registry.ts` (modify) | `registerScoutingIPC()` registrieren |
| `src/renderer/api/scouting.api.ts` | Typed `window.ipc.invoke`-Wrapper |
| `src/renderer/store/scouting.store.ts` | Zustand-Session-Store, orchestriert parse/validate/score/IPC |
| `src/renderer/features/scouting/LineupDialog.tsx` | Startaufstellung beider Teams + Rotation + Setter |
| `src/renderer/features/scouting/ScoreBoard.tsx` | Satz + Punktestand |
| `src/renderer/features/scouting/RotationDisplay.tsx` | 6er-Grid beider Teams |
| `src/renderer/features/scouting/ValidationErrors.tsx` | Live-Fehlerliste |
| `src/renderer/features/scouting/CommandLine.tsx` | Code-Eingabe + Parse-Feedback (Kernkomponente) |
| `src/renderer/features/scouting/RallyLog.tsx` | Chronologische, scrollbare Codeliste |
| `src/renderer/features/scouting/ScoutingView.tsx` | Layout-Orchestrator, lädt Session, hält alles zusammen |
| `src/renderer/store/ui.store.ts` (modify) | `TabType` um `'scouting'` erweitern |
| `src/renderer/features/layout/TabContent.tsx` (modify) | Tab-Typ `scouting` → `ScoutingView` |
| `src/renderer/features/matches/MatchList.tsx` (modify) | „Scouten"-Aktion öffnet `scouting`-Tab |
| `tests/unit/code-parser.test.ts` | Parser-Grammatik |
| `tests/unit/code-validator.test.ts` | Roster/Zone/Reihenfolge |
| `tests/unit/scoring.test.ts` | Punkt + Side-out-Rotation |
| `tests/unit/scouting.repo.test.ts` | Transaktion, Trikot-Auflösung, Cascade-Delete |

---

## Task 1: Shared Types

**Files:** Modify `src/shared/types.ts`

- [ ] **Step 1:** `Rally`-Interface um ein Feld erweitern: `actions: Action[];` ergänzen (Repo/Store geben Rallies immer inkl. ihrer Actions zurück).

- [ ] **Step 2:** Am Dateiende folgende exportierte Interfaces ergänzen (reine Typen, keine Logik; `TeamSide`, `Skill`, `Effect`, `TeamPlayer`, `Rally`, `Action` existieren bereits):
  - `ParsedAction`: `{ team: TeamSide; playerNumber: number; skill: Skill; skillSubtype: string | null; startZone: number | null; endZone: number | null; effect: Effect | null; rawToken: string }`.
  - `ParsedSub`: `{ team: TeamSide; out: number; in: number }`.
  - `ParsedRally`: `{ actions: ParsedAction[]; subs: ParsedSub[]; timeouts: { team: TeamSide }[]; pointTeam: TeamSide | null; rotationSet: number | null; sideSwitch: 1 | 2 | null; rawInput: string }`.
  - `ScoutingValidationError`: `{ token: string; message: string; position: number }` (position = Zeichen-Offset im Roh-Input).
  - `ScoutingSession`: `{ matchId: number; setNumber: number; homeScore: number; awayScore: number; rotationHome: number; rotationAway: number; servingTeam: TeamSide; homeTeamId: number; awayTeamId: number; homeRoster: TeamPlayer[]; awayRoster: TeamPlayer[] }`.
  - `ScoringState`: `{ homeScore: number; awayScore: number; rotationHome: number; rotationAway: number; servingTeam: TeamSide }`.
  - `RallyOutcome`: `ScoringState & { pointTeam: TeamSide | null }`.

- [ ] **Step 3:** `npx tsc --noEmit` läuft sauber.
  Run: `npx tsc --noEmit` → Expected: keine Fehler.

- [ ] **Step 4:** Commit
  `git commit -am "feat(shared): add scouting parser/session/scoring types"`

---

## Task 2: Code-Parser (TDD)

**Files:** Create `tests/unit/code-parser.test.ts`, `src/renderer/lib/code-parser.ts`

Vertrag: `export function parseCode(raw: string): ParsedRally`. Splittet `raw` an `.` in ENTRYs, klassifiziert jeden ENTRY (Action / Sub / Timeout / Point / Rotation / Sideswitch), füllt das passende Feld von `ParsedRally`. Unbekanntes Token → Eintrag wird übersprungen (Validierung meldet später; Parser wirft nicht). `team` default `home` wenn kein `a`. Mehrstellige Trikotnummer greedy (1–2 Ziffern). Bei Zonen: erste Ziffer = startZone, optionale zweite = endZone.

- [ ] **Step 1:** Failing test schreiben. Mindestfälle (Input → Erwartung):
  - `'a10SQ#15'` → 1 action: team `away`, playerNumber 10, skill `S`, skillSubtype `Q`, effect `#`, startZone 1, endZone 5, rawToken `'a10SQ#15'`.
  - `'7R#1'` → 1 action: team `home`, #7, skill `R`, subtype null, effect `#`, startZone 1, endZone null.
  - `'14S'` → 1 action: home #14, skill `S`, alles übrige null.
  - `'14A#5.a3B='` → 2 actions: [home #14 `A` `#` zone5], [away #3 `B` `=`]; `pointTeam` null.
  - `'C11:24'` → `subs` = `[{ team:'home', out:11, in:24 }]`, actions leer.
  - `'aC5:8'` → `subs` = `[{ team:'away', out:5, in:8 }]`.
  - `'T'` → `timeouts` = `[{ team:'home' }]`; `'aT'` → `[{ team:'away' }]`.
  - `'P'` → `pointTeam` `'home'`; `'Pa'` → `pointTeam` `'away'`.
  - `'Z3'` → `rotationSet` 3. `'I2'` → `sideSwitch` 2.
  - `''` / Whitespace → leeres ParsedRally (alle Arrays leer, Skalare null), `rawInput` = Original.

- [ ] **Step 2:** Run `npx vitest run tests/unit/code-parser.test.ts` → Expected: FAIL (Modul nicht gefunden).

- [ ] **Step 3:** `code-parser.ts` implementieren bis grün. Hinweis: Risiko `.`-Verbund vs. Zonenziffer — `.` ist immer ENTRY-Trenner, Zonen sind nur Ziffern; daher zuerst an `.` splitten, dann je ENTRY zeichenweise tokenisieren.

- [ ] **Step 4:** Run `npx vitest run tests/unit/code-parser.test.ts` → Expected: alle grün.

- [ ] **Step 5:** Commit
  `git add tests/unit/code-parser.test.ts src/renderer/lib/code-parser.ts && git commit -m "feat(scouting): add code parser (TDD)"`

---

## Task 3: Code-Validator (TDD)

**Files:** Create `tests/unit/code-validator.test.ts`, `src/renderer/lib/code-validator.ts`

Vertrag: `export function validateRally(parsed: ParsedRally, session: ScoutingSession): ScoutingValidationError[]`. Prüft jede Action gegen den Session-Zustand; sammelt Fehler (leeres Array = gültig). `position` = Offset des `rawToken` in `parsed.rawInput` (via `indexOf`).

- [ ] **Step 1:** Failing test. Helper: minimale Session mit Home-Roster Trikots {7,14} und Away-Roster {3,10}, servingTeam `home`, Rotationen 1/1. Fälle:
  - Trikotnummer nicht im Roster (`'a99A#5'`) → ein Fehler, message enthält „Roster" oder „Nummer".
  - Startzone außerhalb 1–9 — Parser liefert keine >9 (einstellig), daher Fall über zweite Ziffer: gültig; stattdessen testen: fehlende Pflicht-Reihenfolge (z.B. `R` als allererste Action ohne vorangehenden Serve im selben Rally) → optionaler Reihenfolge-Fehler. Mindestens *einen* Reihenfolge-Check abdecken: erste Action eines Rally darf nicht `B`/`D` (Block/Dig ohne vorangehenden Angriff/Aufschlag) sein → ein Fehler.
  - Gültiger Rally (`'14SQ#5'`, Home #14 im Roster) → leeres Array.
  - Sub auf Trikot, das nicht im Roster ist (`out` unbekannt) → ein Fehler.
  - Mehrere Fehler in einem Rally → Array-Länge = Anzahl Verstöße, Reihenfolge = Token-Reihenfolge.

- [ ] **Step 2:** Run `npx vitest run tests/unit/code-validator.test.ts` → Expected: FAIL.

- [ ] **Step 3:** `code-validator.ts` implementieren. Roster-Lookup über `session.homeRoster`/`awayRoster` `shirt_number`. Reihenfolge-Regel bewusst schlank halten (Scope-Note: keine vollständige Skill-Sequenz-Engine in Phase 1).

- [ ] **Step 4:** Run → Expected: grün.

- [ ] **Step 5:** Commit
  `git add tests/unit/code-validator.test.ts src/renderer/lib/code-validator.ts && git commit -m "feat(scouting): add code validator (TDD)"`

---

## Task 4: Scoring + Auto-Rotation (TDD)

**Files:** Create `tests/unit/scoring.test.ts`, `src/renderer/lib/scoring.ts`

Vertrag: `export function deriveOutcome(parsed: ParsedRally, state: ScoringState): RallyOutcome`. Ableitungsregeln:
- Manueller Override: `parsed.pointTeam` gesetzt → das ist `pointTeam`.
- Sonst aus *letzter* Action: eigener Abschluss `#` bei `S`/`A`/`B` → Punkt für deren Team; eigener `=`-Fehler (jede Skill) → Punkt fürs Gegnerteam; Annahme `R` mit `=` → Punkt fürs aufschlagende Team (Ass). Kein eindeutiger Abschluss → `pointTeam` null (Score/Rotation unverändert).
- Rotation/Side-out: wenn `pointTeam` ≠ `state.servingTeam` (Side-out), rotiert das punktende (annehmende) Team um +1 (1→2→…→6→1), neuer `servingTeam` = `pointTeam`. Wenn `pointTeam` = `servingTeam`, keine Rotation, `servingTeam` bleibt.
- Score: `homeScore`/`awayScore` des punktenden Teams +1.
- `parsed.rotationSet` / `sideSwitch` werden hier NICHT verarbeitet (macht der Store direkt auf der Session).

- [ ] **Step 1:** Failing test. Startstate `{ home:0, away:0, rotHome:1, rotAway:1, serving:'home' }`. Fälle:
  - Aufschlag-Ass Heim (`parsed` letzte Action home `S` `#`) → home 1, serving bleibt home, Rotationen unverändert.
  - Annahmefehler Gast (`a..R=`) → Punkt Heim (aufschlagend), serving home, keine Rotation (pointTeam == serving).
  - Angriff-Kill Gast bei Aufschlag Heim (`a..A#`) → Side-out: away 1, serving→away, rotAway 1→2.
  - Eigenfehler Heim-Angriff (`14A=`) bei serving home → Punkt Gast, Side-out: away 1, serving→away, rotAway→2.
  - Manueller `P` → Punkt Heim unabhängig von Actions.
  - Rotation-Wrap: rotAway 6 + Side-out an Gast → rotAway 1.

- [ ] **Step 2:** Run `npx vitest run tests/unit/scoring.test.ts` → Expected: FAIL.

- [ ] **Step 3:** `scoring.ts` implementieren. Reine Funktion, keine I/O.

- [ ] **Step 4:** Run → Expected: grün.

- [ ] **Step 5:** Commit
  `git add tests/unit/scoring.test.ts src/renderer/lib/scoring.ts && git commit -m "feat(scouting): add scoring + auto-rotation (TDD)"`

---

## Task 5: Scouting-Repo (TDD)

**Files:** Create `tests/unit/scouting.repo.test.ts`, `src/main/db/scouting.repo.ts`

Vertrag (alle nehmen `db: Database.Database` als erstes Arg, Muster wie 1a-Repos, `mapDbError` für Constraints):
- `createRally(db, { matchId, setNumber, rallyNumber, rotationHome, rotationAway, pointTeam, homeScoreAfter, awayScoreAfter, rawInput }, actions: Omit<ParsedAction,'rawToken'>[] & raw): Rally` — **transaktional** (`db.transaction(...)`): schreibt eine `rallies`-Zeile + alle `actions`-Zeilen (action_order 0-basiert), löst pro Action `player_id` aus `team_players` über (Team→team_id, playerNumber→shirt_number) auf (null wenn nicht gefunden), verlinkt Angriff→Block via `linked_id` wenn aufeinanderfolgende Actions Gegner-`A`/`B` sind, gibt das `Rally` inkl. `actions[]` zurück.
- `listRallies(db, matchId, setNumber): Rally[]` — chronologisch (`rally_number`), jeweils mit `actions[]` (action_order).
- `deleteRally(db, id): void` — Cascade über FK löscht Actions; gibt nichts zurück.
- `createSubstitution(db, { matchId, setNumber, afterRally, team, playerOutNum, playerInNum }): void`.
- `createTimeout(db, { matchId, setNumber, afterRally, team }): void`.

- [ ] **Step 1:** Failing test mit In-Memory-DB-Helper (`freshDb()` wie in `tests/unit/migrations.test.ts`: `new Database(':memory:')`, `foreign_keys = ON`, `runMigrations`). Setup: 2 Teams, je 1 Spieler im Roster (`team_players`), 1 Match. Fälle:
  - `createRally` mit 1 Action (Home #7 R `#` Zone1) schreibt 1 Rally + 1 Action; `listRallies` liefert sie mit aufgelöstem `player_id` = der Roster-Spieler.
  - Action mit Trikotnummer ohne Roster-Eintrag → `player_id` null, `player_number` trotzdem gesetzt.
  - `createRally` mit Verbund `14A#5.a3B=` (Home-Angriff, Away-Block) → 2 Actions, Block-`linked_id` zeigt auf die Angriffs-Action-id.
  - `deleteRally` entfernt Rally und (Cascade) deren Actions — `listRallies` danach leer, `SELECT count(*) FROM actions` = 0.
  - Transaktion: künstlicher Fehler in zweiter Action (z.B. ungültiger `set_number` via direktem Bruch) rollt die Rally-Zeile zurück (count rallies = 0). *(Falls schwer künstlich zu erzeugen: diesen Unterfall weglassen, Transaktionalität ist durch `db.transaction` strukturell sichergestellt.)*
  - `createSubstitution` + `createTimeout` schreiben je eine Zeile (`SELECT count(*)`).

- [ ] **Step 2:** Run `npx vitest run tests/unit/scouting.repo.test.ts` → Expected: FAIL.

- [ ] **Step 3:** `scouting.repo.ts` implementieren. `db.transaction()` von better-sqlite3 für `createRally`. Prepared statements wiederverwenden.

- [ ] **Step 4:** Run → Expected: grün.

- [ ] **Step 5:** Commit
  `git add tests/unit/scouting.repo.test.ts src/main/db/scouting.repo.ts && git commit -m "feat(scouting): add transactional scouting repo (TDD)"`

---

## Task 6: Scouting-IPC + API

**Files:** Create `src/main/ipc/scouting.ipc.ts`, `src/renderer/api/scouting.api.ts`; Modify `src/main/ipc/registry.ts`

Kanäle existieren bereits in `src/shared/ipc-channels.ts` (`RALLY_CREATE`, `RALLY_DELETE`, `ACTION_DELETE`, `SUB_CREATE`, `TIMEOUT_CREATE`). `ACTION_CREATE` wird in Phase 1b nicht einzeln genutzt (Actions entstehen nur über `RALLY_CREATE`) — nicht implementieren.

- [ ] **Step 1:** `scouting.ipc.ts` mit `registerScoutingIPC()`: je ein `handle(IPC.X, …)` das das Repo mit `getDb()` aufruft:
  - `RALLY_CREATE` → `createRally` (Request trägt Rally-Felder + bereits geparste/validierte Actions; Parsing passiert im Renderer, der Handler persistiert nur).
  - `RALLY_DELETE` → `deleteRally`.
  - `SUB_CREATE` → `createSubstitution`. `TIMEOUT_CREATE` → `createTimeout`.
  - Zusätzlich einen List-Kanal nötig: prüfe ob ein Kanal zum Laden bestehender Rallies existiert — falls nicht, ergänze `RALLIES_LIST: 'rallies:list'` in `ipc-channels.ts` und einen Handler → `listRallies`.

- [ ] **Step 2:** In `registry.ts` `registerScoutingIPC()` importieren und in `registerAllIPC()` aufrufen.

- [ ] **Step 3:** `scouting.api.ts`: typed Wrapper `scoutingApi.createRally(...)`, `deleteRally(id)`, `listRallies(matchId, setNumber)`, `createSub(...)`, `createTimeout(...)` — alle über `window.ipc.invoke<T>(IPC.X, payload)`.

- [ ] **Step 4:** Run `npx vitest run` (Regression) und `npx tsc --noEmit` → Expected: grün / keine Typfehler.

- [ ] **Step 5:** Commit
  `git add src/main/ipc/scouting.ipc.ts src/main/ipc/registry.ts src/renderer/api/scouting.api.ts src/shared/ipc-channels.ts && git commit -m "feat(scouting): wire scouting IPC handlers and api"`

---

## Task 7: Scouting-Store (Zustand)

**Files:** Create `src/renderer/store/scouting.store.ts`

State: `session: ScoutingSession | null`, `rallies: Rally[]`, `currentInput: string`, `validationErrors: ScoutingValidationError[]`, `pendingRally: ParsedRally | null`.

Actions (Vertrag):
- `startSession(matchId, setNumber)`: lädt Match (`matchesApi.get`) + beide Roster (`rosterApi.get`), setzt initiale Session (Score 0/0, Rotationen aus LineupDialog-Default 1/1 bis Dialog sie setzt, servingTeam aus Dialog), lädt bestehende Rallies via `scoutingApi.listRallies`.
- `setInput(raw)`: speichert `currentInput`, ruft `parseCode` → `pendingRally`, ruft `validateRally(pending, session)` → `validationErrors`. Reine Renderer-Logik, kein IPC.
- `submitCode()`: bricht ab wenn `validationErrors` nicht leer (kein Override in Phase 1). Sonst: `deriveOutcome(pending, scoringStateFromSession)` → neue Scores/Rotation/serving; ruft `scoutingApi.createRally(...)` mit den abgeleiteten Rally-Feldern + `pending.actions`; bei `pending.subs`/`timeouts` zusätzlich `createSub`/`createTimeout` (mit `afterRally` = neue rally_number); wendet `pending.rotationSet`/`sideSwitch` direkt auf die Session an; hängt die zurückgegebene Rally an `rallies`, aktualisiert Session-Scores/Rotation, leert `currentInput`/`pendingRally`/`validationErrors`.
- `undoLastRally()`: letzte Rally aus `rallies`, `scoutingApi.deleteRally(id)`, dann Score/Rotation/serving aus den verbleibenden Rallies neu ableiten (entweder rückwärts rechnen oder vollständige Reduktion über `deriveOutcome` ab Startzustand — die Reduktion ist robuster und nutzt die schon getestete Funktion).
- `nextSet()`: persistierten Satz abschließen, `setNumber`+1, Rallies/Scores zurücksetzen, neuen LineupDialog auslösen.

- [ ] **Step 1:** Store nach obigem Vertrag schreiben (Muster: bestehende 1a-Stores). `rotationNumber`-Helfer 1–6 inline.

- [ ] **Step 2:** `npx tsc --noEmit` → keine Fehler.

- [ ] **Step 3:** Commit
  `git add src/renderer/store/scouting.store.ts && git commit -m "feat(scouting): add scouting session store"`

---

## Task 8: LineupDialog

**Files:** Create `src/renderer/features/scouting/LineupDialog.tsx`

Zweck: beim Match-/Satzstart 6 Startspieler je Team + Anfangsrotation + Setter wählen; Ergebnis in die Session schreiben.

- [ ] **Step 1:** Komponente auf `Dialog`-Primitive (1a). Props: `homeRoster`, `awayRoster` (`TeamPlayer[]`), `onConfirm(initial: { rotationHome; rotationAway; servingTeam; … })`, `onCancel`. Pro Team: 6 `Select`-Felder (Position 1–6) befüllt aus Roster, ein Setter-Marker, Radio „Aufschlag Heim/Gast". Speichern-Button disabled bis beide Teams 6 valide (eindeutige) Spieler + servingTeam gewählt. Gestylte Primitiven, kein nacktes Control (UI-Standard).

- [ ] **Step 2:** `npx tsc --noEmit` → keine Fehler.

- [ ] **Step 3:** Commit
  `git add src/renderer/features/scouting/LineupDialog.tsx && git commit -m "feat(scouting): add lineup dialog"`

---

## Task 9: Präsentationskomponenten (ScoreBoard, RotationDisplay, ValidationErrors)

**Files:** Create `ScoreBoard.tsx`, `RotationDisplay.tsx`, `ValidationErrors.tsx` (alle in `features/scouting/`)

Reine, zustandslose Render-Komponenten (lesen Props bzw. Store-Selektoren).

- [ ] **Step 1:** `ScoreBoard.tsx` — zeigt aktuellen Satz, Heim-/Gast-Punkte groß, aufschlagendes Team markiert. Kompakt, dark, data-dense (UI-Standard).
- [ ] **Step 2:** `RotationDisplay.tsx` — zwei 6er-Grids (Heim/Gast), aktuelle Rotation hervorgehoben, Trikotnummern in Zellen.
- [ ] **Step 3:** `ValidationErrors.tsx` — Liste aus `validationErrors`; leer → unauffälliger „OK"-Zustand; Fehler → rote Zeilen mit Token + Message.
- [ ] **Step 4:** `npx tsc --noEmit` → keine Fehler.
- [ ] **Step 5:** Commit
  `git add src/renderer/features/scouting/ScoreBoard.tsx src/renderer/features/scouting/RotationDisplay.tsx src/renderer/features/scouting/ValidationErrors.tsx && git commit -m "feat(scouting): add scoreboard, rotation display, validation list"`

---

## Task 10: CommandLine + RallyLog

**Files:** Create `CommandLine.tsx`, `RallyLog.tsx` (in `features/scouting/`)

- [ ] **Step 1:** `CommandLine.tsx` (Kernkomponente) — gestyltes Text-Input, `value`=`currentInput`, `onChange`→`setInput`. Enter → `submitCode` (blockiert bei Fehlern); ⌘/Ctrl+Z bzw. eigener Undo-Button → `undoLastRally`. Live unter dem Feld: geparste Vorschau (Spieler/Skill/Effekt in Klartext) + Fehler-Hinweis. `no-drag` sicherstellen (body ist drag). Fokus bleibt nach Submit im Feld (Keyboard-Workflow).
- [ ] **Step 2:** `RallyLog.tsx` — scrollbare chronologische Liste der `rallies`; pro Zeile rally_number, `raw_input`, Punktestand danach, punktendes Team; neueste sichtbar (auto-scroll). Klick auf Zeile optional Markierung (kein Edit in Phase 1).
- [ ] **Step 3:** `npx tsc --noEmit` → keine Fehler.
- [ ] **Step 4:** Commit
  `git add src/renderer/features/scouting/CommandLine.tsx src/renderer/features/scouting/RallyLog.tsx && git commit -m "feat(scouting): add command line input and rally log"`

---

## Task 11: ScoutingView + Tab-/Match-Verdrahtung

**Files:** Create `ScoutingView.tsx`; Modify `src/renderer/store/ui.store.ts`, `features/layout/TabContent.tsx`, `features/matches/MatchList.tsx`

- [ ] **Step 1:** `ui.store.ts` — `TabType`-Union um `'scouting'` erweitern (`'home' | 'match' | 'season' | 'team' | 'player' | 'report' | 'scouting'`). `'match'` bleibt die Spiele-Liste (`MatchList`); `'scouting'` ist die Live-Erfassung eines konkreten Spiels (`params: { matchId: number }`).
- [ ] **Step 2:** `ScoutingView.tsx` — Orchestrator. Liest `matchId` aus den Tab-`params`, ruft beim Mount `startSession`. Zeigt LineupDialog wenn noch keine Aufstellung gesetzt; danach Layout: oben `ScoreBoard`, links `CommandLine`+`ValidationErrors`+`RallyLog`, rechts `RotationDisplay`. Bezieht State aus `useScoutingStore`.
- [ ] **Step 3:** `TabContent.tsx` — Branch für Tab-`type` `'scouting'` → `<ScoutingView/>` rendern (Muster wie die bestehenden Branches `case 'match': return <MatchList />` etc.).
- [ ] **Step 4:** `MatchList.tsx` — „Scouten"-Aktion pro Zeile (Icon-Button, `lucide-react`, z.B. `PlayCircle`) in der bestehenden Actions-Spalte, öffnet via `useUIStore().openTab({ type:'scouting', label: \`${m.home_team_name} vs ${m.away_team_name}\`, params:{ matchId: m.id } })`.
- [ ] **Step 5:** `npx tsc --noEmit` und `npx vitest run` → keine Fehler / grün.
- [ ] **Step 6:** Commit
  `git add src/renderer/features/scouting/ScoutingView.tsx src/renderer/store/ui.store.ts src/renderer/features/layout/TabContent.tsx src/renderer/features/matches/MatchList.tsx && git commit -m "feat(scouting): add scouting view and wire match tab launch"`

---

## Task 12: Verifikation + Abschluss

**Files:** keine neuen

- [ ] **Step 1:** Volle Unit-Suite: `npx vitest run` → alle grün (parser, validator, scoring, repo + Phase-0/1a).
- [ ] **Step 2:** `npx tsc --noEmit` → keine Typfehler.
- [ ] **Step 3:** Manueller End-to-End-Durchstich in der echten App (`npm run dev`, DoD 1b): Match → LineupDialog → kompletten Satz live tippen (Aufschläge, Annahmen, Angriffe, Block-Verbund, Sub `C`, Timeout `T`, manueller `P`); prüfen dass ScoreBoard, RotationDisplay (Side-out-Rotation!) und RallyLog korrekt mitlaufen; Undo testet Score-/Rotation-Rückrechnung; App neu starten → Daten persistent.
- [ ] **Step 4:** `/code-review` und `/simplify` über den Branch-Diff; Findings einarbeiten.
- [ ] **Step 5:** `superpowers:finishing-a-development-branch` für Merge/PR.

---

## Self-Review (gegen Design-Doc §3)

| Design-Anforderung | Task |
|---|---|
| Grammatik (S/R/A/B/D/E, Servetype, Effect, Zonen, `.`-Verbund) | 2 |
| Sub `C`, Timeout `T`, Point `P/Pa`, Rotation `Z`, Sideswitch `I` | 2 (Parser), 7 (Store wendet an) |
| Validierung Roster/Zone/Reihenfolge | 3 |
| Auto-Scoring + Auto-Rotation (Side-out) | 4 |
| Transaktionale rally+action Persistenz, player_id-Auflösung, Angriff→Block-Link | 5 |
| IPC `rally:create/delete`, `sub:create`, `timeout:create` (+ rallies:list) | 6 |
| Session-Store, submit/undo Flow | 7 |
| LineupDialog (neu ggü. tech-spec) | 8 |
| Komponenten ScoutingView/CommandLine/RallyLog/ScoreBoard/RotationDisplay/ValidationErrors | 9–11 |
| DoD: Satz live tippbar, Tests grün, persistent, Undo | 12 |

**Risiken adressiert:** Parser-`.`-Mehrdeutigkeit (Task 2 Step 3 Hinweis), Side-out-Rotation (Task 4 isolierte Sequenz-Tests), LineupDialog als kleiner Zusatz (Task 8).
