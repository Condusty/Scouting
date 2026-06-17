# Team-Spieler-UI — Design

> **Status:** Design (freigegeben).
> **Vorgänger:** Phase 1a (Datenverwaltung), Phase 1b (Live-Scouting, in Arbeit).
> **Einordnung:** Erstes von 4 nachträglichen UX-Verbesserungen zu Phase 1a/1b
> (siehe Folge-Specs für Test-Daten-Generator, Code-Edit im RallyLog,
> Notation-Dokumentation).

---

## 1. Scope & Motivation

Zwei zusammenhängende Probleme aus Phase 1a:

1. **Spieler-Tab zeigt alle Spieler aller Teams.** An team-bezogenen Stellen
   (Aufstellung, Kader) ist das unnötig — relevant sind immer nur die Spieler
   *eines* Teams.
2. **Aufstellung (LineupDialog) per 6×2 Dropdown ist mühsam.** Gewünscht:
   Kader als klickbare/ziehbare Liste, Positionen per Drag & Drop zuweisen.

Beide Punkte betreffen denselben Datensatz (`team_players`-Roster) und werden
gemeinsam umgesetzt.

**Out of scope** (eigene Specs):
- Test-Daten-Generator (Seasons/Teams/Players, Nationalmannschafts-Vorbild)
- Nachträgliches Editieren von Codes im RallyLog (+ Re-Scoring)
- Notation-Dokumentation

---

## 2. Teil A — Spieler-Tab wird team-bezogen

### 2.1 UI-Flow

- **Team-Select oben** (Pflichtfeld, alle Teams aus `teams:list`). Keine
  „Alle Teams"-Option.
- Darunter **Tabelle des Team-Kaders** (`roster:get` → `TeamPlayer[]`):
  Nr., Name, Code, Position, Größe/Gewicht/Reichweite, Libero (✓), Setter (✓).
- **„+ Spieler"** öffnet Dialog mit zwei Modi (Segmented Control):
  - **„Neu anlegen"**: volles `PlayerForm` (Vorname, Nachname, Code, Position,
    Größe, Gewicht, Reichweite) + Roster-Felder (Trikotnummer, Libero, Setter).
    Speichern → `players:create` dann `roster:add-player`.
  - **„Vorhandenen hinzufügen"**: Auswahl aus Spielern, die noch *nicht* im
    Kader dieses Teams sind (`usePlayersStore().players` minus aktueller
    Roster — wie bisher in `TeamRoster.tsx`), + Trikotnummer, Libero, Setter.
    Speichern → `roster:add-player`. Ermöglicht Mehrfach-Team-Zuordnung
    (z. B. Nationalmannschaft + Verein).
- **Zeile anklicken** → Edit-Dialog, gleiche Felder wie „Neu anlegen"
  (Basisdaten + Roster-Felder), vorbefüllt. Speichern → `players:update` +
  `roster:update`.
- Im Edit-Dialog zwei trennbare Aktionen:
  - **„Aus Kader entfernen"** (nicht-destruktiv) → `roster:remove-player`.
  - **„Spieler komplett löschen"** (destruktiv, mit `ConfirmDialog`) →
    `players:delete`. Handler liefert klare Fehlermeldung statt SQLite-Error,
    falls Spieler in anderen Rosters/Matches referenziert ist (Delete-Schutz
    aus Phase 1a gilt weiter).
- Inline-Icon je Zeile für „Aus Kader entfernen" (schnellzugriff, wie bisher
  Trash-Icon in `TeamRoster.tsx`).

### 2.2 Leere Zustände

- Keine Teams vorhanden → `EmptyState`: „Noch keine Teams — lege zuerst ein
  Team an." (kein Cross-Tab-Sprung nötig, Hinweistext reicht).
- Team ohne Kader → `EmptyState`: „Noch keine Spieler im Kader" + CTA
  „+ Spieler".

### 2.3 TeamList / TeamRoster

- `TeamRoster.tsx` entfällt vollständig.
- „Kader"-Icon-Button in `TeamList.tsx` öffnet/aktiviert den Spieler-Tab und
  setzt das ausgewählte Team auf das angeklickte Team (via
  `openTab({ type: 'player', label: 'Spieler', params: { teamId: t.id } })`;
  Spieler-Tab liest `params.teamId` als initiale Auswahl, sonst erstes Team
  in der Liste).

### 2.4 Komponenten & Dateien

| Datei | Änderung |
|---|---|
| `features/players/PlayerList.tsx` | Wird team-bezogene Ansicht: Team-Select + Roster-Tabelle statt globaler Spielerliste |
| `features/players/PlayerForm.tsx` | unverändert (reine Basisdaten-Felder) |
| `features/players/RosterMemberDialog.tsx` *(neu)* | „Neu anlegen" / „Vorhanden hinzufügen"-Toggle; kombiniert `PlayerForm` mit separatem Roster-Felder-Block (Trikotnummer, Libero, Setter) und kapselt beide Speicherpfade |
| `features/teams/TeamRoster.tsx` | entfällt |
| `features/teams/TeamList.tsx` | „Kader"-Button → `openTab` mit `teamId`-Param statt `TeamRoster`-Dialog |
| `store/players.store.ts`, `store/roster.store.ts`, `store/teams.store.ts` | keine Strukturänderung, nur kombinierte Nutzung |

### 2.5 IPC / Datenfluss

Keine neuen Channels — bestehende `players:*` und `roster:*` (Phase 1a)
decken alle Fälle ab. Komponente orchestriert zwei sequentielle Calls bei
„Neu anlegen" (`players:create` → `roster:add-player`). Schlägt der zweite
Call fehl (z. B. doppelte Trikotnummer), bleibt der Spieler global angelegt,
aber nicht im Kader — Fehlermeldung zeigt das an, Nutzer kann ihn über
„Vorhandenen hinzufügen" erneut zuordnen (kein automatischer Rollback nötig,
da Spieler ohnehin global existieren dürfen).

---

## 3. Teil B — Lineup-Dialog: Drag & Drop

### 3.1 Layout (pro Team, zwei Spalten Heim/Gast wie bisher)

```
Kader
[#7 Müller] [#9 Klein] [#11 Bauer S] [#3 Horn] ...

      Netz
 [ 4 ] [ 3 ] [ 2 ]
 [ 5 ] [ 6 ] [ 1 ]
```

- **Kader-Chips**: alle Roster-Spieler des Teams (`TeamPlayer[]`), Anzeige
  `#{shirt_number} {last_name}`, Badge **S** (Setter) / **L** (Libero) wo
  zutreffend. Bereits platzierte Spieler verschwinden aus der Kader-Liste.
- **2×3-Feld**: Positionen entsprechend Volleyball-Rotationsnorm (Netz oben,
  vordere Reihe 4-3-2, hintere Reihe 5-6-1). Jede Zelle = Drop-Ziel.

### 3.2 Interaktion

- **Drag & Drop** (native HTML5, kein neues Package): Chip aus Kader-Liste auf
  freie Zelle ziehen → platziert. Auf belegte Zelle ziehen → ersetzt (alter
  Chip wandert zurück in Kader).
- Klick auf platzierten Chip → zurück in Kader-Liste (Klick als
  Lösch-Shortcut, kein Re-Drag nötig).
- Aufschlag-Team-Auswahl bleibt unverändert (Button-Toggle Heim/Gast).
- **Validierung**: „Speichern" aktiv erst wenn beide Teams alle 6 Zellen
  gefüllt haben + Aufschlag-Team gewählt.

### 3.3 Datenvertrag-Änderung: Startrotation entfällt

Bisher: `LineupSelection` enthielt zusätzlich `rotationHome`/`rotationAway`
(1-6, „Referenz-Rotation" für `homeLineup`/`awayLineup`). Mit direktem
Drag & Drop auf die Startpositionen ist die Zell-Position bereits die
tatsächliche Startposition für dieses Set — eine separate Referenzrotation
ist überflüssig.

- `LineupSelection` verliert `rotationHome`/`rotationAway`.
- `scouting.store.setLineup` setzt `session.rotationHome = 1` und
  `session.rotationAway = 1` fest (Referenzpunkt = „Lineup-Array entspricht
  1:1 den Startpositionen").
- `RotationDisplay` verliert die Props `referenceRotationHome` /
  `referenceRotationAway` (waren in der aktuellen WIP-Version ohnehin nicht
  von `ScoutingView` befüllt — diese Inkonsistenz wird damit aufgelöst).
  `shirtAtPosition` nutzt intern `referenceRotation = 1`, Formel vereinfacht
  sich zu `lineup[(position - 1 + (currentRotation - 1)) % 6]`.

### 3.4 Komponenten & Dateien

| Datei | Änderung |
|---|---|
| `features/scouting/LineupDialog.tsx` | `LineupColumn` komplett neu: Kader-Chips + 2×3-Drop-Grid statt 6× `Select`; „Startrotation"-Feld entfernt |
| `features/scouting/RotationDisplay.tsx` | `referenceRotationHome`/`referenceRotationAway` Props entfernt, `shirtAtPosition` vereinfacht |
| `features/scouting/ScoutingView.tsx` | `RotationDisplay`-Aufruf unverändert (4 Props, wie aktuell) |
| `shared/types.ts` | `LineupSelection`: `rotationHome`/`rotationAway` entfernt |
| `store/scouting.store.ts` | `setLineup` setzt `rotationHome`/`rotationAway` fest auf `1` |

---

## 4. Testing

- Bestehende Tests für `code-parser`/`code-validator`/`scoring` unberührt
  (Datenvertrag-Änderung betrifft nur Lineup-Erfassung, nicht Scoring-Logik
  selbst — `nextRotation`/`deriveOutcome` bleiben unverändert).
- `RotationDisplay`: bestehende/zu ergänzende Unit-Tests für
  `shirtAtPosition` mit `referenceRotation = 1` fest verdrahtet.
- Manuell (kein automatisierter UI-Test in Phase 1): Drag & Drop beider
  Teams, Klick-Entfernen, Validierung (Speichern erst bei 6/6 je Team),
  Spieler-Tab Team-Wechsel, „+ Spieler" beide Modi, Edit inkl. „Aus Kader
  entfernen" und „Spieler komplett löschen" (inkl. FK-Schutz-Fehlermeldung).

---

## 5. DoD

- Spieler-Tab: Team-Auswahl oben, zeigt nur dessen Kader, alle CRUD-Pfade
  (neu/vorhanden/edit/entfernen/löschen) funktionieren end-to-end.
- `TeamRoster.tsx` entfernt, „Kader"-Button aus `TeamList` öffnet Spieler-Tab
  mit vorausgewähltem Team.
- LineupDialog: Drag & Drop funktioniert für beide Teams, Validierung korrekt,
  resultierende Session-Daten (`homeLineup`/`awayLineup`, `rotationHome`/
  `rotationAway = 1`) korrekt in `scouting.store` und `RotationDisplay`.
- `npm test` weiterhin grün.
