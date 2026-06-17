import type { Effect, ParsedAction, ParsedRally, ParsedSub, Skill, TeamSide } from '@shared/types';

export const SKILL_LABELS: Record<Skill, string> = {
  S: 'Aufschlag',
  R: 'Annahme',
  A: 'Angriff',
  B: 'Block',
  D: 'Abwehr',
  E: 'Zuspiel',
  F: 'Freeball',
};

export const EFFECT_LABELS_GENERIC: Record<Effect, string> = {
  '#': 'perfekt',
  '+': 'positiv',
  '!': 'neutral',
  '-': 'negativ',
  '/': 'Weiterspiel',
  '=': 'Fehler',
};

export const EFFECT_LABELS_BY_SKILL: Partial<Record<Skill, Partial<Record<Effect, string>>>> = {
  S: {
    '#': 'Ass',
    '+': 'Annahme schwer, keine Kombination',
    '!': 'Annahme auf 3m-Linie',
    '-': 'Annahme leicht, Kombination möglich',
    '/': 'Rückschlag ins eigene Feld',
    '=': 'Fehler',
  },
  R: {
    '#': 'perfekt (4)',
    '+': 'gut (3)',
    '!': '3m-Linie (2)',
    '-': 'schwach (1)',
    '/': 'Overpass (0.5)',
    '=': 'Fehler (0)',
  },
  B: {
    '#': 'Stuff/Punkt',
    '+': 'berührt, Gegenangriff möglich',
    '!': 'Gegner deckt & greift erneut an',
    '/': 'Netzfehler',
    '=': 'Block-Out',
  },
  D: {
    '#': 'Gegenangriff möglich',
    '+': 'Gegenangriff möglich',
    '/': 'Ball zurück zum Angreifer',
    '=': 'Fehler/Punktverlust',
  },
};

export const TEAM_LABELS: Record<TeamSide, string> = {
  home: 'Heim',
  away: 'Gast',
};

export function describeAction(action: ParsedAction): string {
  const parts = [`${TEAM_LABELS[action.team]} #${action.playerNumber}`, SKILL_LABELS[action.skill]];

  if (action.effect !== null) {
    const label = EFFECT_LABELS_BY_SKILL[action.skill]?.[action.effect] ?? EFFECT_LABELS_GENERIC[action.effect];
    parts.push(`(${label})`);
  }

  if (action.startZone !== null) {
    const zone =
      action.endZone !== null ? `Zone ${action.startZone}→${action.endZone}` : `Zone ${action.startZone}`;
    parts.push(zone);
  }

  return parts.join(' ');
}

export function describeSub(sub: ParsedSub): string {
  return `${TEAM_LABELS[sub.team]} Wechsel: #${sub.out} → #${sub.in}`;
}

export function describePendingRally(rally: ParsedRally): string[] {
  const parts: string[] = [];

  for (const action of rally.actions) {
    parts.push(describeAction(action));
  }

  for (const sub of rally.subs) {
    parts.push(describeSub(sub));
  }

  for (const timeout of rally.timeouts) {
    parts.push(`${TEAM_LABELS[timeout.team]} Auszeit`);
  }

  if (rally.pointTeam !== null) {
    parts.push(`Punkt ${TEAM_LABELS[rally.pointTeam]}`);
  }

  if (rally.rotationSet !== null) {
    parts.push(`Rotation → ${rally.rotationSet}`);
  }

  return parts;
}
