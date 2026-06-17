# Session-Persistenz & Auto-Resume — Design

## Ziel

Scouting-Session überdauert App-Neustart. Lineup wird pro Satz gespeichert und beim Wiederöffnen automatisch geladen. Aufstellung muss nur beim ersten Mal oder zum Satzanfang eingegeben werden. Satzende wird automatisch erkannt (25+2 / 15+2).

## DB-Änderungen

**Migration `002_set_lineups.sql`** — drei neue Spalten in `sets`:

```sql
ALTER TABLE sets ADD COLUMN home_lineup   TEXT;   -- JSON: [p1,p2,p3,p4,p5,p6] (Trikotnummern Position 1–6)
ALTER TABLE sets ADD COLUMN away_lineup   TEXT;
ALTER TABLE sets ADD COLUMN serving_team  TEXT CHECK(serving_team IN ('home','away',NULL));
```

## Neuer IPC-Kanal

`SET_UPSERT` — schreibt/aktualisiert einen `sets`-Eintrag (match_id, set_number, home_lineup, away_lineup, serving_team). Verwendet `INSERT OR REPLACE` / `ON CONFLICT DO UPDATE`.

`SET_GET` — liest einen einzelnen `sets`-Eintrag per (match_id, set_number). Gibt `null` zurück wenn nicht vorhanden.

`SETS_FOR_MATCH` — gibt alle `sets`-Zeilen für ein Match zurück (für die Satz-Erkennung beim Start).

## `startSession(matchId)` — kein setNumber-Parameter mehr

1. Lade alle `sets`-Zeilen für `matchId` mit gespeichertem Lineup (`serving_team IS NOT NULL`)
2. Nimm den höchsten `set_number` → das ist der aktive Satz. Kein Eintrag → `setNumber = 1`
3. Lade Rallies für `(matchId, setNumber)` via `listRallies`
4. **Rallies vorhanden + Lineup gespeichert:**
   - Rekonstruiere Score/Rotation via `reduceRally`-Kaskade (wie in `updateRally`)
   - `needsLineup: false` → direkt in Scouting-Screen, Rally-Log gefüllt
5. **Lineup gespeichert, keine Rallies:**
   - `initialState` aus gespeichertem Lineup setzen, Score = 0:0
   - `needsLineup: false`
6. **Kein Lineup:**
   - `needsLineup: true` → Lineup-Dialog

## `setLineup()` — speichert in DB

Nach Zustand-Update im Store sofort `SET_UPSERT` aufrufen mit `(matchId, setNumber, homeLineup, awayLineup, servingTeam)`.

## Automatisches Satzende

Hilfsfunktion `setTargetScore(setNumber: number): number` → `setNumber === 5 ? 15 : 25`.

Nach jedem `submitCode`: prüfe `isSetComplete(homeScore, awayScore, setNumber)`:
```
max(homeScore, awayScore) >= target && |homeScore - awayScore| >= 2
```

Wenn ja → `setCompleted: true` im Store-State.

**UI:** `ScoutingView` zeigt Banner über dem Rally-Log:
> „Satz {N} — {Teamname} gewinnt {homeScore}:{awayScore}"
> Button „Nächster Satz"

Button ruft `nextSet()` auf.

## `nextSet()` — angepasst

Inkrementiert `setNumber`, löscht Score/Rallies/Lineup aus Store, setzt `needsLineup: true`, `setCompleted: false`. Kein DB-Write (nächstes Lineup wird beim Bestätigen geschrieben).

## ScoutingView-Änderungen

- `startSession(matchId)` — kein `setNumber`-Argument mehr
- `setCompleted`-Banner mit Satzsieger und „Nächster Satz"-Button
- Lineup-Dialog bleibt wie bisher (wird jetzt nur seltener gezeigt)

## Out of Scope

- Finalscore in `sets.home_score` / `sets.away_score` schreiben (derivable from rallies)
- Manuelle Satz-Navigation (zurück zu altem Satz)
- Konfigurierbare Punktziele
