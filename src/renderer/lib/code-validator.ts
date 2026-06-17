import type {
  ParsedAction,
  ParsedRally,
  ParsedSub,
  ScoutingSession,
  ScoutingValidationError,
  TeamSide,
} from '@shared/types';

const SKILLS_REQUIRING_PRECEDING_ACTION = new Set(['B', 'D']);

function rosterFor(session: ScoutingSession, team: TeamSide) {
  return team === 'home' ? session.homeRoster : session.awayRoster;
}

function tokenPosition(rawInput: string, rawToken: string): number {
  return rawInput.indexOf(rawToken);
}

function validateAction(
  action: ParsedAction,
  index: number,
  parsed: ParsedRally,
  session: ScoutingSession,
): ScoutingValidationError[] {
  const errors: ScoutingValidationError[] = [];
  const position = tokenPosition(parsed.rawInput, action.rawToken);

  const roster = rosterFor(session, action.team);
  const onRoster = roster.some((player) => player.shirt_number === action.playerNumber);
  if (!onRoster) {
    errors.push({
      token: action.rawToken,
      message: `Player number ${action.playerNumber} is not on the ${action.team} team roster`,
      position,
    });
  }

  // Order check: the first action in a rally must not be a Block or Dig,
  // since those require a preceding attack/serve action that, by definition,
  // cannot exist earlier in the same rally.
  if (index === 0 && SKILLS_REQUIRING_PRECEDING_ACTION.has(action.skill)) {
    errors.push({
      token: action.rawToken,
      message: `Skill "${action.skill}" cannot be the first action of a rally; it requires a preceding attack/serve`,
      position,
    });
  }

  return errors;
}

function validateSub(
  sub: ParsedSub,
  parsed: ParsedRally,
  session: ScoutingSession,
  rawToken: string,
): ScoutingValidationError[] {
  const errors: ScoutingValidationError[] = [];
  const position = tokenPosition(parsed.rawInput, rawToken);

  const roster = rosterFor(session, sub.team);
  const outOnRoster = roster.some((player) => player.shirt_number === sub.out);
  if (!outOnRoster) {
    errors.push({
      token: rawToken,
      message: `Player number ${sub.out} is not on the ${sub.team} team roster`,
      position,
    });
  }

  return errors;
}

/**
 * Validates a parsed rally against the current scouting session state.
 * Returns a list of validation errors; an empty array means the rally is valid.
 */
export function validateRally(
  parsed: ParsedRally,
  session: ScoutingSession,
): ScoutingValidationError[] {
  const errors: ScoutingValidationError[] = [];

  parsed.actions.forEach((action, index) => {
    errors.push(...validateAction(action, index, parsed, session));
  });

  parsed.subs.forEach((sub) => {
    // ParsedSub doesn't carry its own rawToken; reconstruct it the same way
    // the parser would have produced it, e.g. "C7:14" / "aC7:14".
    const rawToken = `${sub.team === 'away' ? 'a' : ''}C${sub.out}:${sub.in}`;
    errors.push(...validateSub(sub, parsed, session, rawToken));
  });

  errors.sort((a, b) => a.position - b.position);

  return errors;
}
