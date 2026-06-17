export interface SkillReferenceEntry {
  code: string;
  label: string;
}

export const SKILL_REFERENCE: SkillReferenceEntry[] = [
  { code: 'S', label: 'Aufschlag' },
  { code: 'R', label: 'Annahme' },
  { code: 'A', label: 'Angriff' },
  { code: 'B', label: 'Block' },
  { code: 'D', label: 'Abwehr' },
  { code: 'E', label: 'Zuspiel' },
];

export interface ServeSubtypeEntry {
  code: string;
  label: string;
}

export const SERVE_SUBTYPE_REFERENCE: ServeSubtypeEntry[] = [
  { code: 'Q', label: 'Sprungaufschlag' },
  { code: 'H', label: 'Flatteraufschlag' },
  { code: 'M', label: 'Sprungflatterer' },
  { code: 'T', label: 'Antäuschen Flatter→Sprungaufschlag' },
];

export interface SpecialCodeEntry {
  code: string;
  description: string;
}

export const SPECIAL_CODE_REFERENCE: SpecialCodeEntry[] = [
  { code: 'a<n>...', description: "Team-Präfix: 'a' = Gast, weggelassen = Heim (z.B. a10S vs 10S)" },
  { code: '.', description: 'Verbundcode: mehrere Aktionen einer Rally verketten (z.B. 14A#5.a3B=)' },
  { code: 'C<raus>:<rein> / aC<raus>:<rein>', description: 'Wechsel Heim/Gast (z.B. C11:24, aC5:8)' },
  { code: 'T / aT', description: 'Auszeit Heim/Gast' },
  { code: 'P / Pa', description: 'manueller Punkt Heim/Gast' },
  { code: 'I<1-6>', description: 'Rotation des aufschlagenden Teams manuell setzen (überschreibt Auto-Rotation)' },
];

export interface ExampleCodeEntry {
  code: string;
  description: string;
}

export const EXAMPLE_CODE_REFERENCE: ExampleCodeEntry[] = [
  { code: 'a10SQ#15', description: 'Gast #10, Sprungaufschlag, Ass, Zone 1→5' },
  { code: '7R#1', description: 'Heim #7, Annahme perfekt (4), Zone 1' },
  { code: '14A#5.a3B=', description: 'Heim #14 Angriff perfekt Zone 5, dann Gast #3 Block Block-Out' },
  { code: 'C11:24', description: 'Heim-Wechsel: #11 raus, #24 rein' },
  { code: 'aC5:8', description: 'Gast-Wechsel: #5 raus, #8 rein' },
  { code: 'T / aT', description: 'Auszeit Heim / Gast' },
  { code: 'P / Pa', description: 'manueller Punkt Heim / Gast' },
  { code: 'I3', description: 'Rotation des aufschlagenden Teams auf Position 3' },
  { code: '14SH', description: 'Heim #14, Flatteraufschlag' },
];

export const PLANNED_CODES_NOTE =
  'Freeball (F), Subzonen (A-D), Setter-Calls (K), Angriffskombinationen und ' +
  'Custom-/Default-Codes sind für spätere Phasen vorgesehen und aktuell nicht aktiv.';
