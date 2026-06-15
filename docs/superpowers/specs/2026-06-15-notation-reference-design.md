# Notation-Referenz-Dialog — Design

## Zweck

In-App-Referenz für die Scouting-Notation (DataVolley/VolleyStation-Codes wie `a10SQ#15`),
aufrufbar während des Live-Scoutens. Basiert auf der korrigierten Phase-1-Grammatik
(`docs/superpowers/specs/2026-06-15-notation-correction-design.md` /
`docs/superpowers/specs/2026-06-12-phase-1-design.md`).

## Entscheidungen (bereits getroffen)

- **Format:** In-App-Referenz-Panel
- **Placement:** Dialog/Overlay via Hilfe-Button ("?"), Eingabe bleibt fokussiert
- **Scope:** Phase-1-Codes + Hinweis auf geplante Codes (Phase 2+)
- **Layout:** Tabs nach Kategorie (`Skills | Effekte | Zonen | Sonder-Codes | Beispiele`)
  + Zonen-Diagramm als Spielfeld-Silhouette mit Netz-Linie

## Komponenten & Dateien

### 1. `src/renderer/features/scouting/notation-reference-data.ts` (neu)

Reine Datenmodule, keine JSX. Re-exportiert/nutzt vorhandene Maps aus `rally-preview.ts`
(`SKILL_LABELS`, `EFFECT_LABELS_GENERIC`, `EFFECT_LABELS_BY_SKILL`) statt sie zu duplizieren.

Exports:

```ts
export interface SkillReferenceEntry { code: string; label: string; }
export const SKILL_REFERENCE: SkillReferenceEntry[]
// S Aufschlag, R Annahme, A Angriff, B Block, D Abwehr, E Zuspiel
// (aus SKILL_LABELS, aber NUR S/R/A/B/D/E — F/Freeball nicht enthalten,
// siehe "Geplante Codes")

export interface ServeSubtypeEntry { code: string; label: string; }
export const SERVE_SUBTYPE_REFERENCE: ServeSubtypeEntry[]
// Q Sprungaufschlag, H Flatteraufschlag, M Sprungflatterer,
// T Antäuschen Flatter→Sprungaufschlag (nur nach S)

export interface SpecialCodeEntry { code: string; description: string; }
export const SPECIAL_CODE_REFERENCE: SpecialCodeEntry[]
// a<n>...      -> Team-Präfix: 'a' = Gast, weggelassen = Heim (z.B. a10S vs 10S)
// .            -> Verbundcode: mehrere Aktionen einer Rally verketten (z.B. 14A#5.a3B=)
// C<raus>:<rein> / aC<raus>:<rein> -> Wechsel Heim/Gast (z.B. C11:24, aC5:8)
// T / aT       -> Auszeit Heim/Gast
// P / Pa       -> manueller Punkt Heim/Gast
// I<1-6>       -> Rotation des aufschlagenden Teams manuell setzen (überschreibt Auto-Rotation)

export interface ExampleCodeEntry { code: string; description: string; }
export const EXAMPLE_CODE_REFERENCE: ExampleCodeEntry[]
// a10SQ#15      -> Gast #10, Sprungaufschlag, Ass, Zone 1→5
// 7R#1          -> Heim #7, Annahme perfekt (4), Zone 1
// 14A#5.a3B=    -> Heim #14 Angriff perfekt Zone 5, dann Gast #3 Block Block-Out
// C11:24        -> Heim-Wechsel: #11 raus, #24 rein
// aC5:8         -> Gast-Wechsel: #5 raus, #8 rein
// T / aT        -> Auszeit Heim / Gast
// P / Pa        -> manueller Punkt Heim / Gast
// I3            -> Rotation des aufschlagenden Teams auf Position 3
// 14SH          -> Heim #14, Flatteraufschlag

export const PLANNED_CODES_NOTE: string
// Hinweistext: "Freeball (F), Subzonen (A-D), Setter-Calls (K),
// Angriffskombinationen und Custom-/Default-Codes sind für spätere
// Phasen vorgesehen und aktuell nicht aktiv."
```

Effekt-Tabelle wird NICHT hier dupliziert — die Dialog-Komponente importiert
`EFFECT_LABELS_GENERIC` und `EFFECT_LABELS_BY_SKILL` direkt aus `rally-preview.ts`
und rendert daraus eine Tabelle (Spalten: Symbol, Generisch, S, R, B, D — Zellen ohne
skill-spezifischen Eintrag zeigen den generischen Wert, leicht abgesetzt/kursiv).

### 2. `src/renderer/features/scouting/CourtZoneDiagram.tsx` (neu)

```ts
export interface CourtZoneDiagramProps {
  className?: string;
}
export function CourtZoneDiagram({ className }: CourtZoneDiagramProps): JSX.Element
```

Statische Spielfeld-Silhouette: 3x3-Raster mit Rahmen (Feldumriss) und einer
hervorgehobenen Linie über der oberen Reihe (Netz). Zonennummern im Raster
(Zeile 1 = Netzreihe, Zeile 2 = Mittelreihe, Zeile 3 = Grundlinie), Reihenfolge:

```
Netz ───────────────
  4  │  3  │  2
─────┼─────┼─────
  7  │  8  │  9
─────┼─────┼─────
  5  │  6  │  1
```

Reine Darstellung (Tailwind-Grid oder einfaches SVG, dark-theme-konform: Linien
`border-zinc-700`, Zonenzahlen `text-zinc-300`, Netzlinie `border-sky-500` o.ä.).
Keine Interaktivität, keine Props außer `className` — wird 1:1 im Zonen-Tab
eingebettet, kurzer Erklärtext daneben: "ZONES = Startzone, optional Endzone
(Flugbahn: Start→Ziel), Ziffern 1–9."

### 3. `src/renderer/features/scouting/NotationReferenceDialog.tsx` (neu)

```ts
export interface NotationReferenceDialogProps {
  open: boolean;
  onClose: () => void;
}
export function NotationReferenceDialog({ open, onClose }: NotationReferenceDialogProps): JSX.Element
```

- Nutzt vorhandene `Dialog` (`src/renderer/components/ui/Dialog.tsx`) mit
  `title="Notation-Referenz"`, `className="max-w-3xl"` (breiter als Default `max-w-lg`).
- Eigene kleine Tab-Leiste (kein Tabs-Primitive vorhanden, kein Radix installiert):
  lokaler `useState<TabId>` (`TabId = 'skills' | 'effekte' | 'zonen' | 'sonder' | 'beispiele'`),
  Reihe von `Button`/`IconButton`-artigen Tab-Triggern (aktiver Tab hervorgehoben,
  z.B. `bg-zinc-800 text-white` vs. `text-zinc-400`), darunter der Tab-Inhalt
  (einfaches `<table>`/Listen-Layout, kompakt, `text-xs`/`text-sm` passend zum
  Dichte-Standard).
- Tab-Inhalte:
  - **Skills:** Tabelle aus `SKILL_REFERENCE` + darunter `SERVE_SUBTYPE_REFERENCE`
    ("Aufschlag-Subtypen, nur nach S").
  - **Effekte:** Tabelle aus `EFFECT_LABELS_GENERIC` + `EFFECT_LABELS_BY_SKILL`
    (Spalten Symbol/Generisch/S/R/B/D, siehe oben). Hinweiszeile: "Angriff (A) und
    Zuspiel (E) nutzen die generischen Labels — im Manual nicht dokumentiert."
  - **Zonen:** `<CourtZoneDiagram />` + Erklärtext.
  - **Sonder-Codes:** Tabelle aus `SPECIAL_CODE_REFERENCE`, darunter `PLANNED_CODES_NOTE`
    als kleine, abgesetzte Hinweiszeile (z.B. `text-zinc-500 text-xs`).
  - **Beispiele:** Tabelle aus `EXAMPLE_CODE_REFERENCE` (Code monospace, Beschreibung daneben).

## Integration: `src/renderer/features/scouting/ScoutingView.tsx`

- Neuer lokaler State `const [helpOpen, setHelpOpen] = useState(false)`.
- `ScoreBoard` erhält ein neues optionales Prop `onOpenHelp?: () => void` (und
  `ScoreBoard.tsx` rendert bei vorhandenem Prop eine `IconButton` mit
  `<HelpCircle size={15} />` aus `lucide-react`, `aria-label="Notation-Referenz"`,
  rechts in der bestehenden `h-12`-Flex-Row, nach der Gast-`TeamScore`).
- `<ScoreBoard ... onOpenHelp={() => setHelpOpen(true)} />`
- `<NotationReferenceDialog open={helpOpen} onClose={() => setHelpOpen(false)} />`
  als Sibling, gerendert im Zweig ohne `needsLineup` (neben `ScoreBoard`).

## Out of Scope

- Live-Verknüpfung mit `CommandLine`/Parser (z.B. Klick auf Beispiel → in Eingabe
  übernehmen) — reine Referenz, keine Interaktion mit dem Eingabefeld.
- Echtes `K`/Setter-Zonen-Tracking, Subzonen A-D, Freeball `F`, Angriffskombinationen —
  nur als Hinweistext erwähnt (`PLANNED_CODES_NOTE`), nicht implementiert.
- Tastatur-Shortcut zum Öffnen (nur Button-Klick in Phase 1).
