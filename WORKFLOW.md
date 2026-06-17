# Volleyball Scouting App — Claude Code Workflow Guide

## 1. Tech Stack Entscheidung

Bevor du anfängst: Stack festlegen. Empfehlung für VolleyStation-Clone:

| Layer | Empfehlung | Alternativ |
|-------|-----------|-----------|
| Desktop-Shell | **Electron** | Tauri (Rust, leichter) |
| UI Framework | **React + TypeScript** | SvelteKit |
| State Management | **Zustand** | Redux Toolkit |
| DB lokal | **SQLite via better-sqlite3** | IndexedDB |
| Video | **HTML5 Video + custom controls** | MPV via IPC |
| Charts/Stats | **Recharts** | D3.js |
| Build | **Vite + electron-builder** | Webpack |
| Testing | **Vitest + Playwright** | Jest |

---

## 2. Skills & Plugins — Wann nutzen

### Zwingend für jede Feature-Phase:
```
/superpowers:brainstorming    → VOR jeder neuen Feature-Implementierung
/superpowers:writing-plans    → Wenn du Tech-Spec oder Phase-Plan brauchst
/superpowers:verification-before-completion  → VOR "fertig" melden
```

### Für Entwicklung:
```
/superpowers:test-driven-development   → Für Business-Logic (Stats-Berechnungen, Scouting-Notation)
/superpowers:systematic-debugging      → Wenn Bug auftritt und unklar wo
/superpowers:finishing-a-development-branch  → Vor PR / Branch-Merge
```

### Für Delegation & Context-Schonung:
```
/cavecrew   → Für Recherche-Tasks, Code-Lokalisierung, Diff-Reviews
             → Spart ~60% Context-Tokens bei langen Sessions
```

### Für Code-Qualität:
```
/code-review      → Nach jeder Phase abgeschlossen
/simplify         → Nach Feature-Implementierung
/security-review  → Vor Release
```

---

## 3. Der Workflow — Schritt für Schritt

### Phase 0: Foundation (1-2 Sessions)

**Schritt 1 — Plan übergeben:**
```
Paste deinen HTML-Plan in Claude Code.
Sage: "Analysiere diesen Feature-Plan und erstelle mit /superpowers:writing-plans
eine detaillierte tech spec mit: Datenbankschema, Komponentenstruktur,
API-Interfaces zwischen Modulen, State-Management-Design."
```

**Schritt 2 — Brainstorming Tech-Stack:**
```
/superpowers:brainstorming
Frage: "Welcher Tech-Stack für VolleyStation-ähnliche Desktop-App?
Wichtig: Offline-first, Video-Sync, DataVolley-kompatibles Format."
```

**Schritt 3 — Projekt scaffolden:**
```
Sage Claude: "Erstelle Electron + React + TypeScript + Vite Projekt-Struktur
mit SQLite. Folge dieser Verzeichnisstruktur: [aus Plan]"
```

---

### Phase 1–N: Feature-Implementierung (pro Phase)

**Template für jede Phase:**

```
1. /superpowers:brainstorming
   → "Ich baue [Feature X]. Welche Edge Cases, DB-Schema, Komponenten brauche ich?"

2. /superpowers:writing-plans
   → Claude erstellt Implementierungsplan mit Tasks

3. Implementierung starten
   → Claude schreibt Code Task by Task

4. Für Business-Logic (Stats, Notation):
   /superpowers:test-driven-development
   → Tests first, dann Implementation

5. Nach Fertigstellung:
   /superpowers:verification-before-completion
   → Claude testet und verifiziert

6. Vor Branch-Merge:
   /superpowers:finishing-a-development-branch
   → Cleanup, Commit-Messages, PR-Beschreibung
```

---

## 4. Feature-Phasen (aus volleystation_feature_overview.html)

### Phase 0 — App Shell (kein Feature, nur Infra)
- [ ] Electron + React + TS + Vite Setup
- [ ] SQLite + Migration-System
- [ ] Tab-basierte Navigation (wie Browser)
- [ ] Design-System / Component Library

### Phase 1 — Grundfunktionen (Core / Grün)

**Datenverwaltung:**
- [ ] Saisons erstellen & verwalten (Name, Code, Start-/Enddatum)
- [ ] Teams anlegen (Name, Code, Trainer, Saison-Zuweisung)
- [ ] Spieler-Datenbank (Nummer, Code, Name, Position, Größe, Gewicht, Reichweite)
- [ ] Mannschaftsaufstellung (Drag & Drop, Libero-Zone, Setter-Zuweisung)
- [ ] Spieler-Codes (unique, z.B. SMI-JOH)
- [ ] Spiele importieren (.dvw DataVolley-Format)

**Live-Scouting:**
- [ ] Kommandozeile (Texteingabe, live während Spiel)
- [ ] Heimteam / Gastteam Präfix (kein Präfix = Heim, 'a' = Gast)
- [ ] Aufschlag-Codes (S) — Typ + Effekt
- [ ] Annahme-Codes (R) — Effekte #/+/!/- ///=
- [ ] Angriff-Codes (A/X/V) — Tempo + Position + Zone + Effekt
- [ ] Block-Codes (B) — verknüpft mit Angriff via Punkt (.)
- [ ] Abwehr-Codes (D)
- [ ] Zuspiel-Codes (E)
- [ ] Verbundcodes mit Punkt (.) — Aufschlag.Annahme und Angriff.Block
- [ ] Zonen-System (1–9, A/B/C/D) — Start- & Endzone
- [ ] Substitution per Code (C11:24)
- [ ] Timeout per Code (T)
- [ ] Punkte manuell vergeben (P)

**UI:**
- [ ] Spielprotokoll (Codeliste — alle Codes chronologisch)

**Reports:**
- [ ] Numerische Match-Reports (Aufschlag, Annahme, Angriff, Block, Abwehr, Zuspiel)
- [ ] Spieler-gefilterte Statistiken

---

### Phase 2 — Mittlere Priorität (Orange)

**Datenverwaltung:**
- [ ] Teams zusammenführen (Merge)
- [ ] Spieler zusammenführen (Merge)
- [ ] Spiele exportieren (.dvw / .xml / .vsm)

**Scouting:**
- [ ] Freeball-Codes (F)
- [ ] Setter-Calls (K-Codes: KA, KB, K1, K2...)
- [ ] Angriffskombinationen (Tempo + Netzposition + Zone)
- [ ] Fehlerhafte Codes zulassen (Shift+Enter)
- [ ] Code-Suche im Spiel (filtern + nach Rotation filtern)
- [ ] Code einfügen / löschen (Insert/Delete nachträglich)

**Cards-Modus:**
- [ ] Basic Cards (Spieler, Element, Effekt per Klick)
- [ ] Intelligente Filterung (nur valide Folgeoptionen)

**Konfiguration:**
- [ ] Standard-Codes (fehlende Code-Teile auto-ergänzen)
- [ ] Benutzerdefinierte Tastenkürzel
- [ ] Effizienzdefinition (konfigurierbar)
- [ ] Coding-Modus: Predictive / Raw
- [ ] Mehrsprachigkeit
- [ ] Saison-Einstellungen kopieren

**Reports:**
- [ ] Rotationsanalyse
- [ ] Setter-Verteilungsreport (Zone, Rotation, Annahmequalität, Kill-Rate)
- [ ] By-Skill-Report
- [ ] Saison-Zusammenfassung (mehrere Spiele)
- [ ] Reports drucken / als Bild exportieren

**Video:**
- [ ] Video verknüpfen (lokal oder Streaming-URL)
- [ ] Code-Video-Synchronisation (Codes mit Timestamps)
- [ ] Videoanalyse-Screen (Spielzüge filtern + abspielen)

**UI:**
- [ ] Drei Layouts (Scout / Show / Synchronize)
- [ ] Validierungsfehler-Liste
- [ ] Match-Kommentar (Freitext)
- [ ] Seitenwechsel-Funktion (Heim ↔ Gast tauschen)

---

### Phase 3 — Erweitert / Optional (Pink)

**Cards-Modus:**
- [ ] Advanced Cards (mehr Details)

**Konfiguration:**
- [ ] Match Flow konfigurieren
- [ ] Combination Maps (Code-Konverter für Fremd-Dateien)

**Reports:**
- [ ] Report-Vorlagen (Presets)

**Spreadsheet (VQL):**
- [ ] Eigene Tabellenkalkulation mit VS-Formeln
- [ ] VSCOUNT, VSCOURT, VSPLAYER... Formeln
- [ ] Heatmaps & Felder in Tabellen
- [ ] Show on Video aus Zelle (Strg+Klick)
- [ ] VolleyStation Report (5 Sheets)
- [ ] Saisonübergreifende Spreadsheets

**Video:**
- [ ] Video-Montage erstellen (Clips nach Filter)
- [ ] Flags & Kategorien (Rallies markieren 1–6)
- [ ] Clips neu anordnen (Drag & Drop)
- [ ] Video exportieren
- [ ] VolleyStation Streamer
- [ ] Tablet-Verbindung (QR-Code)

**Kollaboration:**
- [ ] Dual Coding (zwei Personen gleichzeitig)
- [ ] Remote Scouting
- [ ] Lizenz-/Account-System
- [ ] PLPS / VolleyMetrics Integration

---

## 5. Konkreter Start-Prompt für heute

Kopiere das in Claude Code (neuer Chat, Feature-Plan als Datei liegt schon im Repo):

```
Ich baue eine Volleyball-Scouting-Desktop-App (VolleyStation-Clone).
Feature-Plan liegt in: volleystation_feature_overview.html

Tech Stack: Electron + React + TypeScript + Vite + SQLite (better-sqlite3)

Nutze /superpowers:writing-plans und erstelle:
1. Vollständiges SQLite-Datenbankschema für Phase 1 (alle Core-Features)
2. Verzeichnisstruktur des Projekts
3. npm-Dependencies (package.json)
4. Electron main process + vite.config.ts Grundgerüst
5. Datenbankschema für: Seasons, Teams, Players, Matches, Rallies, Actions

Fokus Phase 1: Datenverwaltung + Code-basiertes Live-Scouting.
DataVolley .dvw Import muss von Anfang an ins Schema passen.
```

---

## 6. Git-Workflow

```bash
# Pro Phase: eigener Branch
git checkout -b phase-1-core-infrastructure
git checkout -b phase-2-data-management
# etc.

# Pro Feature: Conventional Commits
feat(scouting): add keyboard notation input
feat(video): sync video timestamp with rally tags
fix(stats): correct attack efficiency calculation
```

---

## 7. Session-Management Tips

- **Lange Sessions**: Nutze `/cavecrew` für Recherche — spart Context
- **Neues Feature**: Immer `/superpowers:brainstorming` zuerst
- **Stuck**: `/superpowers:systematic-debugging`
- **Context voll**: Neuen `/run` oder `/verify` am Anfang der Session
- **Vor Commit**: `/superpowers:finishing-a-development-branch`

---

## 8. DataVolley Format Reference

DataVolley `.dvw` Notation (wichtig für Kompatibilität):
```
[Team][Player#][Skill][Type][Error/Success][Direction][Zone]
Beispiel: *14S#5 = Team*, Spieler 14, Serve, #=exzellent, Zone 5
Skills: S=Serve, R=Reception, A=Attack, B=Block, D=Dig, E=Set
```
Claude kennt dieses Format — kannst direkt fragen.

---

## Next Step

1. Paste deinen HTML-Feature-Plan in neuen Chat
2. Nutze Prompt aus Abschnitt 5
3. Phase 1 starten mit `/superpowers:brainstorming`
