# Phase 1 Design — Datenverwaltung, Live-Scouting, Reports

> **Status:** Design (freigegeben). Quelle für die Implementierungspläne 1a–1c.
> **Vorgänger:** Phase 0 (Scaffold) abgeschlossen — siehe `docs/superpowers/plans/2026-06-09-phase-0-scaffold.md`.
> **Tech-Referenz:** `docs/specs/tech-spec.md` (Schema, IPC, Typen).
> **Feature-Orientierung:** VolleyStation-Manual
> (https://volleystation.freshdesk.com/support/solutions/articles/103000030663-volleystation-manual).

---

## 1. Scope & Abhängigkeiten

**Ziel:** Eigenständig nutzbare Scouting-App — Stammdaten anlegen, ein Spiel live per
Code-Eingabe erfassen, numerische Reports ansehen. Kein Video, kein DVW, keine Cards
(alles Phase 2).

**3 Sub-Bereiche + Reihenfolge:**

```
1a Datenverwaltung ──┬─→ 1b Live-Scouting ──→ 1c Reports
  (Seasons,          │     (Parser, CommandLine,    (Match-Report,
   Teams, Players,   │      RallyLog, Score/         Player-Stats)
   Rosters, Matches) │      Rotation, Subs/TO)
                     │                              ▲
                     └──────────────────────────────┘
```

**Abhängigkeiten:**
- 1b braucht aus 1a: Match (welche 2 Teams), Roster beider Teams (Trikotnummern →
  player_id-Auflösung, Setter/Libero-Markierung), Startaufstellung (Rotation 1–6).
- 1c braucht aus 1b: geschriebene `rallies` + `actions`. Stats lesen nur DB, schreiben nie.
- Geteilte Basis (schon in Phase 0): Schema `001_initial.sql`, `shared/types.ts`,
  IPC-Bridge, Tab-Shell.

**Was Phase 0 liefert (nicht neu bauen):** DB-Connection, Migrationen, UIStore/Tabs,
Seasons-IPC-Handler (CRUD existiert für Seasons schon — nur UI fehlt).

**Build-Ansatz:** Hybrid — vertikale Slices in Abhängigkeitsreihenfolge (1a → 1b → 1c),
aber Pure-Logic-Kerne (`code-parser`, `code-validator`, `scoring`, `stats-engine`)
TDD-first innerhalb ihres Slices (WORKFLOW.md-Regel: TDD für Business-Logik).

**Explizit raus aus Phase 1** (Schema-Felder bleiben ungenutzt):
`video_path`/`video_time_ms`, `rally_flags`, `team_merges`/`player_merges`, DVW-Import/Export,
Freeball `F`, Subzonen A–D, Setter-Calls `K`, Angriffskombinationen, Custom-Codes,
`settings`-Tabelle, Drag&Drop-Roster, Shift+Enter-Override, konfigurierbare Effizienz.

---

## 2. Sub-Bereich 1a: Datenverwaltung

**Zweck:** CRUD für Stammdaten. Liefert alles, was ein Match zum Scouten braucht.

**4 Entitäten, je Liste + Formular (Tab-Inhalt):**

| Entität | Felder (Pflicht fett) | Besonderheit |
|---|---|---|
| Season | **name**, **code** (unique), start_date, end_date | code z.B. `2024-25` |
| Team | **name**, **code** (unique, 3-Buchstaben), coach | n:m zu Seasons via `season_teams` |
| Player | **code** (unique, z.B. `SMI-JOH`), **first_name**, **last_name**, position, height_cm, weight_kg, reach_cm | code = Identität im Scouting |
| Match | **home_team_id**, **away_team_id**, season_id, match_date, venue, comment | Teams müssen existieren |

**Roster (Team-Aufstellung) — Komponente `TeamRoster.tsx`:**
- Spieler einem Team zuordnen: `shirt_number` (unique pro Team), `is_libero`, `is_setter`.
- Phase 1 vereinfacht: **Liste + Nummern-Eingabe + Checkboxen** (kein Drag&Drop; Libero-Zone
  und visuelle Setter-Zuweisung → Phase 2).
- Startaufstellung (welche 6 + Rotation) wird **nicht** hier gesetzt, sondern beim
  Match-Start in 1b (Lineup-Dialog).

**Neue IPC-Handler (Seasons existiert schon):**
- `teams.ipc.ts`: LIST/CREATE/UPDATE/DELETE (kein MERGE — Phase 2)
- `players.ipc.ts`: LIST/CREATE/UPDATE/DELETE (kein MERGE)
- `roster.ipc.ts`: GET / ADD_PLAYER / REMOVE_PLAYER / UPDATE
- `matches.ipc.ts`: LIST/GET/CREATE/UPDATE/DELETE
- Alle registriert in `registry.ts`. Je ein `*.api.ts`-Wrapper im Renderer. Je ein Zustand-Store.

**Validierung (Handler + Form):**
- Unique-Verletzung (code) → klare Fehlermeldung statt SQLite-Raw-Error.
- Match: `home_team_id` ≠ `away_team_id`.
- Player `position` ∈ Enum oder null.
- Delete-Schutz: Team/Player mit Match-Referenzen → warnen (kein FK-Crash).

**Komponenten:** `SeasonList/Form`, `TeamList/Form/Roster`, `PlayerList/Form`,
`MatchList/Form` — geöffnet als Tabs über Sidebar.

**DoD 1a:** Saison→Team→Spieler→Roster→Match in UI durchklickbar, persistiert,
übersteht App-Neustart. Unit-Tests für Handler-Validierung (unique, FK).

---

## 3. Sub-Bereich 1b: Live-Scouting (Kern)

**Zweck:** Spiel live per Tastatur erfassen. `CommandLine` = wichtigste Komponente der App.

### Notation-Grammatik (Phase-1-Subset, EBNF)

```
RALLY      := ENTRY ('.' ENTRY)*          ; '.' = Ballübergang zur Aktion danach
ENTRY      := ACTION | SUB | TIMEOUT | POINT | ROTATION | SIDESWITCH
ACTION     := TEAM? PLAYER SKILL SERVETYPE? EFFECT? ZONES?
TEAM       := '*'  (Heim, weglassbar)  |  'a'  (Gast)
PLAYER     := DIGIT{1,2}                   ; Trikotnummer
SKILL      := 'S'|'R'|'A'|'B'|'D'|'E'      ; Serve/Reception/Attack/Block/Dig/Set
SERVETYPE  := 'Q'|'M'|'T'                  ; nur nach S: Q=Sprung, M=Flatter, T=Sprungflatter
EFFECT     := '#'|'+'|'!'|'-'|'/'|'='      ; perfekt/positiv/neutral/negativ/overpass/Fehler
ZONES      := DIGIT DIGIT?                 ; Startzone, optional Endzone (1–9)
SUB        := TEAM? 'C' PLAYER ':' PLAYER  ; z.B. C11:24  (raus:rein)
TIMEOUT    := TEAM? 'T'
POINT      := 'P' | 'Pa'                   ; manuelle Punktvergabe Heim/Gast
ROTATION   := 'Z' DIGIT                    ; Setter-Rotation 1–6 setzen
SIDESWITCH := 'I' ('1'|'2')               ; Seite 1/2
```

Beispiele (aus VS-Manual, Phase-1-reduziert):
- `a10SQ#15` → Gast #10, Sprungaufschlag, Ass, Zone 1→5
- `7R#1` → Heim #7, Annahme perfekt, Zone 1
- `14A#5.a3B=` → Heim #14 Angriff perfekt Zone 5 **.** Gast #3 Block Fehler

### Auto-Scoring + Auto-Rotation (Kernlogik, TDD)
- **Punkt automatisch** aus letzter Action ableiten: eigener `#`-Abschluss (Serve-Ass,
  Angriff-Kill, Block) → eigener Punkt; eigener `=`-Fehler → Gegnerpunkt; Annahme `=`
  → Aufschlag-Ass für Gegner. `P`/`Pa` überschreibt manuell.
- **Rotation automatisch:** Side-out (Aufschlagrecht wechselt) → annehmendes Team rotiert
  um 1 Position. `Z` überschreibt manuell.
- Beides reine Funktion `deriveOutcome(rally) → {pointTeam, newRotations, newScore}` —
  isoliert testbar.

### Flow
1. **Session-Start:** Match öffnen → Lineup-Dialog (6 Startspieler je Team +
   Anfangsrotation + Setter wählen). Schreibt Anfangszustand in `scouting.store`.
2. **Eingabe:** `CommandLine` → `parseCode(raw)` → `ParsedRally`. Live-Validierung zeigt
   Fehler in `ValidationErrors` (Nummer nicht im Roster, ungültige Zone, Skill-Reihenfolge).
3. **Commit (Enter):** gültig → IPC `rally:create` + `action:create` (transaktional),
   Score/Rotation aktualisiert, Zeile in `RallyLog`. Ungültig → blockiert
   (kein Shift+Enter-Override; Phase 2).
4. **Undo:** letzte Rally löschen (`rally:delete`, cascade Actions), Score/Rotation
   zurückrechnen.

### Komponenten
`ScoutingView` (Orchestrator) · `CommandLine` (Eingabe + Parse-Feedback) ·
`RallyLog` (chronologische Codeliste, scrollbar) · `ScoreBoard` (Satz/Punkte) ·
`RotationDisplay` (6er-Grid beider Teams) · `ValidationErrors` (Fehlerliste).

### lib + Tests (TDD-first)
- `lib/code-parser.ts` → `parseCode(raw): ParsedRally` — Grammatik oben.
- `lib/code-validator.ts` → `validate(parsed, session): ValidationError[]` — Roster/Zone/Reihenfolge.
- `lib/scoring.ts` → `deriveOutcome(...)` — Punkt + Rotation.
- Tests: `code-parser.test.ts`, `code-validator.test.ts`, `scoring.test.ts` (höchste Priorität).

### IPC (Channel-Konstanten existieren, Handler neu)
`rally:create`, `rally:delete`, `action:create`, `action:delete`, `sub:create`,
`timeout:create` → `scouting.ipc.ts`, transaktional.

**DoD 1b:** Kompletten Satz live tippbar; Parser+Validator+Scoring grün getestet;
RallyLog + Score + Rotation aktualisieren korrekt; Undo funktioniert; Daten persistent.

---

## 4. Sub-Bereich 1c: Reports

**Zweck:** Numerische Auswertung der erfassten Actions. Nur-Lesen.

### Stats-Kern (TDD-first, pure TS)
`lib/stats-engine.ts` → nimmt `Action[]`, liefert Aggregationen. Kernmetrik pro Skill:

```
SkillStats = { total, excellent(#), positive(+), neutral(!), negative(-), error(=),
               efficiency = (excellent - error) / total }
```

Phase 1 feste Formel (konfigurierbare Effizienz → Phase 2, `settings`-Tabelle).

### Zwei Reports

**1. Match-Report** (`MatchReport.tsx`, IPC `report:match`):
- Pro Team: Serve / Reception / Attack / Block / Dig / Set als `SkillStats`-Zeilen.
- Aufschlüsselung pro Spieler (`byPlayer`).
- Satzergebnisse (set-by-set).
- Tabellarisch; Recharts-Balken optional, kein DoD-Muss.

**2. Player-Stats** (`PlayerStats.tsx`, IPC `report:player-stats`):
- Spieler-gefiltert über ein/mehrere Matches (`match_id?`, `season_id?`, `player_id?`).
- Gleiche SkillStats-Struktur, aggregiert über Matches (`matchCount`).

**Phase 2 (raus):** Rotationsanalyse, Setter-Verteilung, By-Skill-Drilldown,
Saison-Zusammenfassung, Druck/Bild-Export, Heatmaps.

### Datenfluss
```
actions (DB) ──IPC report:* (main)──→ stats-engine ──→ ReportData ──→ React-Tabelle
```
Aggregation im **Main-Prozess** (SQL-Aggregat + stats-engine); Renderer rendert nur.

### Tests
`stats-engine.test.ts` — Effizienzformel, Effekt-Zählung, Mehr-Match-Aggregation.

**DoD 1c:** Erfasstes Match zeigt korrekten Match-Report (beide Teams, alle 6 Skills,
pro Spieler); Player-Stats filterbar; stats-engine grün getestet; Zahlen stimmen mit
manueller Kontrollrechnung überein.

---

## 5. Gesamt-DoD & Plan-Dekomposition

### Phase-1-Definition-of-Done (alles erfüllt = fertig)
1. **End-to-End-Durchstich:** Saison → 2 Teams + Spieler + Roster → Match → Satz live
   scouten → Match-Report + Player-Stats korrekt. Ohne Workarounds, in der echten App.
2. **Persistenz:** Alles übersteht App-Neustart (SQLite-Datei).
3. **Tests grün:** `code-parser`, `code-validator`, `scoring`, `stats-engine`,
   Handler-Validierung, Phase-0-Tests. `npm test` sauber.
4. **Keine toten Enden:** Jeder Sidebar-Eintrag öffnet funktionierenden Tab.
5. **Sauberkeit:** `/code-review` + `/simplify` nach jedem Sub-Bereich; Conventional
   Commits; Branch pro Sub-Bereich.

### Dekomposition → 3 Implementierungspläne
| Plan | Inhalt | Hängt ab von |
|---|---|---|
| `phase-1a-data-mgmt.md` | Teams/Players/Roster/Matches Handler+API+Store+UI, Validierung | Phase 0 |
| `phase-1b-scouting.md` | parser/validator/scoring (TDD) + scouting.ipc + scouting.store + ScoutingView-Komponenten + Lineup-Dialog | 1a |
| `phase-1c-reports.md` | stats-engine (TDD) + report:* Handler + MatchReport/PlayerStats UI | 1b |

Jeder Plan = eigener `writing-plans`-Lauf, eigener Branch, abgearbeitet mit
`subagent-driven-development` / `executing-plans`.

### Risiken / offene Punkte
- **Parser-Mehrdeutigkeit** `.`-Verbundcodes ↔ Zonen-Ziffern: Grammatik früh per TDD absichern.
- **Rotation-Side-out-Logik:** klassische Fehlerquelle → isolierte `scoring.ts`-Tests mit
  bekannten Spielsequenzen.
- **Lineup-Dialog** nicht im ursprünglichen tech-spec — neu in 1b, kleiner Zusatz.
