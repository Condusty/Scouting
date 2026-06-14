import type { ParsedAction, ParsedRally, ParsedSub, Skill, Effect, TeamSide } from '@shared/types';

const SKILLS = new Set(['S', 'R', 'A', 'B', 'D', 'E', 'F']);
const SERVE_TYPES = new Set(['Q', 'M', 'T']);
const EFFECTS = new Set(['#', '+', '!', '-', '/', '=']);

function emptyRally(rawInput: string): ParsedRally {
  return {
    actions: [],
    subs: [],
    timeouts: [],
    pointTeam: null,
    rotationSet: null,
    sideSwitch: null,
    rawInput,
  };
}

/**
 * Parses a single ENTRY token (no '.' inside) and applies it to the rally,
 * mutating the matching field. Unknown tokens are silently skipped.
 */
function parseEntry(token: string, rally: ParsedRally): void {
  const trimmed = token.trim();
  if (trimmed.length === 0) return;

  let i = 0;
  let team: TeamSide = 'home';

  // Optional leading 'a' = away team (for actions, subs, timeouts)
  if (trimmed[i] === 'a') {
    team = 'away';
    i++;
  }

  const rest = trimmed.slice(i);

  // SUB := TEAM? 'C' PLAYER ':' PLAYER
  if (rest.startsWith('C')) {
    const sub = parseSub(rest.slice(1), team);
    if (sub) rally.subs.push(sub);
    return;
  }

  // TIMEOUT := TEAM? 'T'
  if (rest === 'T') {
    rally.timeouts.push({ team });
    return;
  }

  // POINT := 'P' | 'Pa'  (note: 'a' comes AFTER 'P' here, not before)
  if (trimmed === 'P') {
    rally.pointTeam = 'home';
    return;
  }
  if (trimmed === 'Pa') {
    rally.pointTeam = 'away';
    return;
  }

  // ROTATION := 'Z' DIGIT
  if (trimmed[0] === 'Z') {
    const digit = trimmed.slice(1);
    if (/^[1-6]$/.test(digit)) {
      rally.rotationSet = Number(digit);
    }
    return;
  }

  // SIDESWITCH := 'I' ('1'|'2')
  if (trimmed[0] === 'I') {
    const digit = trimmed.slice(1);
    if (digit === '1' || digit === '2') {
      rally.sideSwitch = digit === '1' ? 1 : 2;
    }
    return;
  }

  // ACTION := TEAM? PLAYER SKILL SERVETYPE? EFFECT? ZONES?
  const action = parseAction(rest, team, trimmed);
  if (action) rally.actions.push(action);
}

function parseSub(rest: string, team: TeamSide): ParsedSub | null {
  // rest := PLAYER ':' PLAYER
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(rest);
  if (!match) return null;
  return { team, out: Number(match[1]), in: Number(match[2]) };
}

function parseAction(rest: string, team: TeamSide, rawToken: string): ParsedAction | null {
  let i = 0;

  // PLAYER := DIGIT{1,2}, greedy
  const playerMatch = /^\d{1,2}/.exec(rest.slice(i));
  if (!playerMatch) return null;
  let playerStr = playerMatch[0];
  i += playerStr.length;

  // Greedy: if we took 2 digits but the next char is also a digit (and not a
  // valid skill follows immediately), that's not representable per grammar -
  // PLAYER is followed directly by SKILL, so a 2-digit match that leaves a
  // valid skill char is correct. If 2 digits leaves no skill letter, fall
  // back to 1 digit.
  if (playerStr.length === 2 && !SKILLS.has(rest[i] ?? '')) {
    playerStr = playerStr[0];
    i = playerStr.length;
  }
  if (!SKILLS.has(rest[i] ?? '')) return null;

  const playerNumber = Number(playerStr);

  // SKILL
  const skill = rest[i] as Skill;
  i++;

  // SERVETYPE := 'Q'|'M'|'T' (only after S)
  let skillSubtype: string | null = null;
  if (skill === 'S' && SERVE_TYPES.has(rest[i] ?? '')) {
    skillSubtype = rest[i];
    i++;
  }

  // EFFECT
  let effect: Effect | null = null;
  if (EFFECTS.has(rest[i] ?? '')) {
    effect = rest[i] as Effect;
    i++;
  }

  // ZONES := DIGIT DIGIT?
  let startZone: number | null = null;
  let endZone: number | null = null;
  const zonesMatch = /^\d{1,2}/.exec(rest.slice(i));
  if (zonesMatch) {
    const digits = zonesMatch[0];
    startZone = Number(digits[0]);
    if (digits.length === 2) {
      endZone = Number(digits[1]);
    }
    i += digits.length;
  }

  // Any leftover characters mean this wasn't a valid action token.
  if (i !== rest.length) return null;

  return {
    team,
    playerNumber,
    skill,
    skillSubtype,
    startZone,
    endZone,
    effect,
    rawToken,
  };
}

export function parseCode(raw: string): ParsedRally {
  const rally = emptyRally(raw);

  if (raw.trim().length === 0) return rally;

  const entries = raw.split('.');
  for (const entry of entries) {
    parseEntry(entry, rally);
  }

  return rally;
}
