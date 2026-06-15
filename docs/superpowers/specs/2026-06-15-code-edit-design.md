# Code-Edit nachträglich — Design

## Zweck

Im RallyLog soll man auf eine bereits eingegebene Rally klicken können, um den Scouting-Code nachträglich zu editieren. Nach dem Edit werden Scoring/Rotation für die editierte Rally und alle folgenden Ralleys neu berechnet (Kaskade).

## Scope

- Beliebige Rally im aktuellen Set editierbar, nicht nur die letzte.
- Edit ersetzt Code komplett — inkl. Actions, Substitutions, Timeouts (kein partielles Patchen).
- Re-Scoring-Kaskade: editierte Rally + alle folgenden Ralleys im Set werden neu berechnet.

## Architektur/Datenfluss

1. Klick auf RallyLog-Zeile → Zeile wird inline editierbar (Text durch Input ersetzt, vorbefüllt mit `raw_input`, Live-Preview wie in `CommandLine`).
2. Enter → Store-Action `updateRally(rallyId, newRawInput)`:
   - `parseCode(newRawInput)` → `ParsedRally`
   - `validateRally(parsed, session)` — Rosters sind über die Session statisch, keine historische Session-Rekonstruktion nötig
   - Bei Validierungsfehlern: `error` setzen, Edit bleibt offen, kein Save
   - State *vor* der editierten Rally ermitteln: `reduceRally` über `rallies[0..index-1]` ausgehend von `initialState`
   - Kaskade ab `index`: für jede Rally `i` von `index` bis Ende — bei `i === index` den neu geparsten Code nutzen, bei `i > index` `raw_input` der gespeicherten Rally neu parsen — jeweils `computeRallyOutcome(parsed_i, state)` aufrufen, state propagieren, Ergebnis als `RallyScoringUpdate` sammeln
   - 1 atomarer IPC-Call (`RALLY_UPDATE`) persistiert: editierte Rally (raw_input, actions, subs, timeouts, scoring) + Scoring-Updates für alle folgenden Ralleys
   - Nach Erfolg: `rallies` im Store mit Response ersetzen, Session-State (Score/Rotation/ServingTeam/currentSide) aus finalem State + letzter Rally neu setzen (gleiches Muster wie `undoLastRally`)
3. Esc → Edit abbrechen, kein Save.

## Backend

**`shared/types.ts`** — neue Typen:
- `UpdateRallyDTO`: wie `CreateRallyDTO`, aber ohne `matchId`/`setNumber`/`rallyNumber` (diese ändern sich beim Edit nicht)
- `RallyScoringUpdate`: `{ id, rotationHome, rotationAway, pointTeam, homeScoreAfter, awayScoreAfter }` — für Kaskaden-Updates an Folge-Ralleys

**`shared/ipc-channels.ts`** — neuer Channel `RALLY_UPDATE: 'rally:update'`

**`scouting.repo.ts`**:
- Extraktion `insertActions(db, rallyId, matchId, actions)` aus `createRally` (bestehende `linked_id`-Pairing-Logik), wiederverwendet von `createRally` und `updateRally`
- Neue Funktion `updateRally(db, id, dto, actions, subs, timeouts, cascade)` — 1 Transaktion:
  - UPDATE `rallies`-Zeile (raw_input + scoring-Felder)
  - DELETE + reinsert `actions` für diese Rally via `insertActions`
  - DELETE + reinsert `substitutions`/`timeouts`, referenziert über `match_id` + `set_number` + `after_rally` = alte `rally_number`
  - Für jede Rally in `cascade`: UPDATE nur scoring-Felder (`rotation_home`, `rotation_away`, `point_team`, `home_score_after`, `away_score_after`)
  - Gibt aktualisierte `Rally[]` zurück (editierte Rally + Kaskade)

**`scouting.ipc.ts`** / **`scouting.api.ts`** — `RALLY_UPDATE` registrieren bzw. als `updateRally` wrappen.

## Renderer-Logik

**`lib/scoring.ts`** — neue exportierte Funktion `computeRallyOutcome(parsed, state): RallyOutcome`:
- Kapselt `deriveOutcome(parsed, state)` + die `rotationSet`-Override-Logik (aktuell inline in `submitCode`, scouting.store.ts ~159-165)
- `submitCode` wird auf diese Funktion umgestellt (DRY, einzige Stelle für Outcome-Berechnung)

**`scouting.store.ts`** — neue Action `updateRally(rallyId, rawInput)`:
- Ablauf wie unter "Architektur/Datenfluss" beschrieben
- Bei Fehler: `error` im Store setzen, State unverändert

## UI

**`RallyLog.tsx`**:
- Klick auf `RallyRow` → statt reinem Highlight-Toggle: Inline-Edit-Modus
- Input vorbefüllt mit `raw_input`, Live-Preview (wie CommandLine) während Tippen
- Enter → `updateRally`, Esc → Abbrechen
- Lokaler Komponenten-State für Validierungsfehler (kein Cross-Talk mit globalem `validationErrors`, das von `CommandLine` genutzt wird)

**Neues Modul `features/scouting/rally-preview.ts`**:
- Extrahiert `describePendingRally`/`describeAction`/`describeSub` + `SKILL_LABELS`/`EFFECT_LABELS`/`TEAM_LABELS` aus `CommandLine.tsx`
- Genutzt von `CommandLine` (bestehend) und `RallyLog`-Inline-Edit (neu)

## Tests

- `scoring.test.ts`: Tests für `computeRallyOutcome`, inkl. `rotationSet`-Override-Fälle
- `scouting.repo.test.ts`: Tests für `updateRally` — actions/subs/timeouts werden ersetzt, Kaskaden-Scoring wird angewendet, alles in 1 Transaktion
- `code-parser`/`code-validator`: unverändert, keine neuen Tests nötig

## Out of Scope

- Mehrfach-Edit-Historie / Undo für Edits
- Editieren von Set-/Match-Metadaten
- Performance-Optimierung für sehr lange Sets (Kaskade ist O(n), unkritisch für Volleyball-Sets)
