# Notation-Korrektur (Z/I, Serve-Types, Effekt-Labels) — Design

## Zweck

Beim Vorbereiten der Notation-Dokumentation (Sub-Projekt D) wurde die implementierte
Phase-1-Grammatik (`code-parser.ts`, `docs/superpowers/specs/2026-06-12-phase-1-design.md`)
gegen das offizielle VolleyStation-Manual abgeglichen. Dabei wurden drei reale
Abweichungen gefunden, die vor der Doku korrigiert werden müssen — sonst würde die
Doku falsches Verhalten beschreiben.

**Quelle:** VolleyStation Freshdesk-Manual, insb. "How to scout a game? - Coding Guide",
"Serve code", "Reception code", "How to change rotation?" (abgerufen via WebFetch/AI-
Summarizer — Inhalte sind plausibel und über mehrere unabhängige Artikel konsistent,
aber nicht wörtlich gegen das Original geprüft).

## Scope

### 1. Rotation-Override-Code: `Z<1-6>` → `I<1-6>`

- **Real:** `I<n>` (z.B. `I2`, `aI4`) = „setze Rotation des Teams auf n" — exakt das,
  was unser `Z<digit>` aktuell tut (`scoring.ts` / `outcome.rotationHome|rotationAway`).
- **Real:** `Z<n>` (z.B. `Z1`) = „weise Spieler in Zone n die Zuspieler-Rolle zu" —
  andere Funktion (Zuspieler-Tracking), aktuell nicht implementiert.
- **Korrektur:** reines Umbenennen des Token-Buchstabens `Z`→`I` im Parser. Keine
  Änderung an `scoring.ts`-Logik oder am Feldnamen `rotationSet` (interner Name,
  nicht an Notation gebunden).
- `Z` bleibt in Phase 1 unbelegt (reserviert für späteres Zuspieler-Zonen-Tracking,
  Phase 2+).

### 2. Sideswitch-Code entfernen (`I<1|2>`, `sideSwitch`, `currentSide`)

- `I` ist jetzt durch Punkt 1 belegt (Rotations-Override) — kann nicht zusätzlich
  Sideswitch bedeuten.
- Im Manual existiert **kein** inline Side-Switch-Code.
- `currentSide`/`sideSwitch` ist aktuell **toter State**: wird berechnet und in
  `ScoutingSession`/`ParsedRally` gehalten, aber von keiner UI-Komponente gelesen
  (`RotationDisplay` nutzt nur `homeLineup`/`awayLineup`/`rotationHome`/`rotationAway`).
  Entfernen ist daher risikoarm.
- `WORKFLOW.md` Phase-1-Punkt „Seitenwechsel (Z1 / I2)" wird entfernt (basierte auf
  der falschen Prämisse).

### 3. Serve-Types `{Q,M,T}` → `{Q,H,M,T}`, Bedeutungen korrigieren

| Code | Real-Bedeutung | Aktuell im Design-Doc |
|------|-----------------|------------------------|
| `Q` | Sprungaufschlag (Jump Serve) | Sprung ✓ |
| `H` | Flatteraufschlag (Float) | **fehlt komplett** |
| `M` | Sprungflatterer (Jump Float) | fälschlich „Flatter" |
| `T` | Antäuschen zu Flatter, dann Sprungaufschlag | fälschlich „Sprungflatter" |

`SERVE_TYPES`-Set in `code-parser.ts` wird auf `{Q,H,M,T}` erweitert/korrigiert.

### 4. Skill-spezifische Effekt-Labels

Effekt-Symbole (`# + ! - / =`) bleiben als Symbol-Set unverändert (Phase-1-Scope
laut `WORKFLOW.md` passt). Aber: ihre Bedeutung ist im Manual **pro Skill
unterschiedlich** definiert. Aktuell hat `rally-preview.ts` eine einzige globale
`EFFECT_LABELS`-Map für alle Skills.

Bestätigte Bedeutungen aus dem Manual:

| Symbol | Serve (S) | Reception (R) | Block (B) | Dig (D) |
|--------|-----------|----------------|-----------|---------|
| `#` | Ass | perfekt (4) | Stuff/Punkt | Gegenangriff möglich |
| `+` | Annahme schwer, keine Kombination | gut (3) | berührt, Gegenangriff möglich | Gegenangriff möglich |
| `!` | Annahme auf 3m-Linie | 3m-Linie (2) | Gegner deckt & greift erneut an | *(keine Angabe)* |
| `-` | Annahme leicht, Kombination möglich | schwach (1) | *(keine Angabe)* | *(keine Angabe)* |
| `/` | Rückschlag ins eigene Feld | Overpass (0.5) | Netzfehler | Ball zurück zum Angreifer |
| `=` | Fehler | Fehler (0) | Block-Out | Fehler/Punktverlust |

Für **Attack (A)** und **Set/Zuspiel (E)** wurden im Manual keine Effekt-Tabellen
gefunden. Diese behalten die aktuellen generischen Labels (`# perfekt, + positiv,
! neutral, - negativ, / Weiterspiel, = Fehler`), markiert als „nicht verifiziert".

**Umsetzung:** `EFFECT_LABELS` wird von `Record<Effect, string>` zu
`Record<Skill, Partial<Record<Effect, string>>>` plus generischer Fallback-Map
(für A/E und für Lücken in der Tabelle, z.B. Dig `!`/`-`). `describeAction` schlägt
zuerst skill-spezifisch nach, fällt sonst auf generisch zurück.

## Geänderte Dateien

- **`src/renderer/lib/code-parser.ts`**
  - `SERVE_TYPES = new Set(['Q', 'H', 'M', 'T'])`
  - ROTATION-Branch: `trimmed[0] === 'Z'` → `trimmed[0] === 'I'`, Regex `/^[1-6]$/`
    bleibt gleich
  - SIDESWITCH-Branch (aktuell `trimmed[0] === 'I'` mit `1`/`2`) komplett entfernen
  - Kommentare/EBNF-Referenzen im Datei-Header anpassen

- **`src/shared/types.ts`**
  - `ParsedRally`: Feld `sideSwitch: 1 | 2 | null` entfernen
  - `ScoutingSession`: Feld `currentSide: 1 | 2` entfernen

- **`src/renderer/store/scouting.store.ts`**
  - `startSession`: `currentSide: 1` aus initialem Session-Objekt entfernen
  - `submitCode`: `currentSide`-Berechnung (Zeile ~197) und `currentSide` im
    `set({ session: {...} })` entfernen
  - `updateRally`: `currentSide`-Neuberechnungs-Loop (Zeilen ~301-306) und
    `currentSide` im `set(...)` entfernen
  - `undoLastRally`: `currentSide`-Tracking (Zeilen ~341, 345, 357) entfernen
  - `nextSet`: `currentSide: 1` entfernen
  - `rotationSet: null` in `emptyRally`-artigen Resets bleibt (gehört zu `I`, nicht
    zu sideswitch)

- **`src/renderer/lib/scoring.ts`**
  - Keine Logikänderung. JSDoc/Kommentar, der `Z` referenziert, auf `I` korrigieren.

- **`src/renderer/features/scouting/rally-preview.ts`**
  - `EFFECT_LABELS` → skill-spezifische Struktur (siehe Tabelle oben) + generischer
    Fallback
  - `describeAction` nutzt skill-spezifisches Label mit Fallback
  - Zeile, die `rally.sideSwitch` beschreibt (`Seitenwechsel → Seite ...`), entfernen

- **`docs/superpowers/specs/2026-06-12-phase-1-design.md`**
  - EBNF-Abschnitt: `SERVETYPE := 'Q'|'H'|'M'|'T'` mit korrigierten Bedeutungen;
    `ROTATION := 'I' DIGIT`; `SIDESWITCH`-Zeile entfernen
  - Effekt-Tabelle (skill-spezifisch) ergänzen, mit Hinweis "A/E nicht verifiziert"

- **`WORKFLOW.md`**
  - Phase-1-Punkt „Seitenwechsel (Z1 / I2)" entfernen

- **Tests**
  - `tests/unit/code-parser.test.ts`: bestehende `Z`-Rotation-Tests → `I`; Sideswitch-
    Tests (`I1`/`I2` als Seitenwechsel) entfernen; neuer Test für `H`-Serve-Type;
    `M`/`T`-Erwartungen ggf. anpassen (Parser unterscheidet Subtypes nicht inhaltlich,
    nur Zeichen — Test prüft `skillSubtype === 'H'|'M'|'Q'|'T'`, keine Bedeutung)
  - `tests/unit/scoring.test.ts`: Test-Inputs mit `Z<n>`-Token auf `I<n>` umstellen
    (Funktionslogik bleibt, nur Beispiel-Codes ändern sich)
  - `tests/unit/code-validator.test.ts` / `tests/unit/scouting.repo.test.ts`: auf
    `sideSwitch`/`currentSide`-Referenzen prüfen, ggf. entfernen

## Out of Scope / Follow-ups

- Echtes `Z<n>` (Zuspieler-Zonen-Zuweisung) implementieren — eigenes Feature,
  braucht Zuspieler-Tracking über Rotationen hinweg. Nicht Teil dieser Korrektur.
- Attack(A)/Set(E)-Effekt-Bedeutungen verifizieren, falls später genauere Manual-
  Quelle verfügbar.
- Side-Switch als UI-Feature (Button/Toggle statt Code) — falls später benötigt,
  separates Sub-Projekt.

## Risiko/Migration

- Branch `phase-1b-scouting` noch nicht in `main` gemerged — `sideSwitch`/
  `currentSide` wurden erst in diesem Branch eingeführt (Commit `53b1937`), keine
  externen Consumer, keine DB-Migration nötig (nicht persistiert).
- Bestehende `Z`-Tests werden umbenannt/ersetzt, nicht zusätzlich beibehalten (kein
  doppeltes `Z`+`I` — `Z` ist nach Korrektur unbelegt).
