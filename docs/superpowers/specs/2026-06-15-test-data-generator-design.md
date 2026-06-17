# Testdaten-Generator — Design

## Zweck

Dev-Skript, das Season/Teams/Spieler/Kader mit realistischen Testdaten befüllt, damit Testdaten nicht händisch in der App angelegt werden müssen.

## Trigger

Neues npm-Skript `npm run seed` → `tsx scripts/seed-test-data.ts`.

- Neues devDependency: `tsx` (versteht `tsconfig.json` paths, also `@shared/*` ohne Build).
- Läuft nur gegen `scouting.dev.db` (cwd) — kein Electron-Kontext nötig, also `connection.ts`/`getDb()` nicht direkt nutzbar (importiert `electron`).

## Dateien

- `scripts/seed-data.ts` — reine Daten + Builder-Funktionen (kein DB-Zugriff, testbar):
  - Team-Liste: GER, POL, ITA, BRA, USA, FRA (Name + Code)
  - Namens-Pools (Vor-/Nachnamen) pro Nation
  - Roster-Bauplan pro Team: 14 Spieler, Verteilung 2× S, 2× L, 4× OH, 3× MB, 3× OPP
  - `buildSeasonData()` → liefert `{ season, teams: [{ team, players: [{ player, rosterEntry }] }] }`
    - Spieler-Code: `<TEAMCODE>-<NN>` (NN = 01..14, global unique)
    - Trikotnummern: zufällige unique Permutation aus 1..18 pro Team
    - height_cm/weight_kg/reach_cm: randomisiert in positionstypischen Ranges (z.B. MB 205-212cm, OH/OPP 195-202cm, S 190-198cm, L 178-188cm; reach ≈ height + 28-32cm)
    - is_setter = true bei Position S, is_libero = true bei Position L

- `scripts/seed-test-data.ts` — CLI-Einstieg:
  1. Öffnet `scouting.dev.db` via `better-sqlite3`, `pragma('foreign_keys = ON')`
  2. Führt Migration `001_initial.sql` aus (`fs.readFileSync` statt `?raw`-Import) — gleiche Logik wie `migrate.ts`, aber dateibasiert
  3. Wipe: `pragma('foreign_keys = OFF')`, `DELETE FROM` jede Tabelle aus `001_initial.sql` (alle Inhalte, dev-DB ist disposable), danach `pragma('foreign_keys = ON')` — vermeidet FK-Reihenfolge-Probleme
  4. Reseed mit `buildSeasonData()`:
     - Season per raw SQL INSERT in `seasons`
     - Teams via `createTeam` (teams.repo.ts)
     - `season_teams`-Verknüpfung per raw SQL INSERT
     - Spieler via `createPlayer` (players.repo.ts)
     - Roster-Einträge via `addRosterPlayer` (roster.repo.ts)
  5. Konsolen-Output: Anzahl angelegter Seasons/Teams/Spieler

## Tests

`tests/unit/seed-data.test.ts` — testet `buildSeasonData()`:
- alle Spieler-Codes global unique
- Trikotnummern unique pro Team
- Positionsverteilung pro Team korrekt (2/2/4/3/3)
- height/weight/reach innerhalb erwarteter Ranges

## Out of Scope

- Matches, Sets, Rallies, Actions (keine Scouting-Session)
- In-App-UI/Button für Generator
- Echte Spielerdaten (nur erfundene, realistische Namen)
