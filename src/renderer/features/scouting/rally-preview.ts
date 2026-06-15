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

export const EFFECT_LABELS: Record<Effect, string> = {
  '#': 'perfekt',
  '+': 'positiv',
  '!': 'neutral',
  '-': 'negativ',
  '/': 'Overpass',
  '=': 'Fehler',
};

export const TEAM_LABELS: Record<TeamSide, string> = {
  home: 'Heim',
  away: 'Gast',
};

export function describeAction(action: ParsedAction): string {
  const parts = [`${TEAM_LABELS[action.team]} #${action.playerNumber}`, SKILL_LABELS[action.skill]];

  if (action.effect !== null) {
    parts.push(`(${EFFECT_LABELS[action.effect]})`);
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

  if (rally.sideSwitch !== null) {
    parts.push(`Seitenwechsel → Seite ${rally.sideSwitch}`);
  }

  return parts;
}
