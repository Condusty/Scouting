import type { ParsedRally, RallyOutcome, ScoringState, TeamSide } from '@shared/types';

function opposite(team: TeamSide): TeamSide {
  return team === 'home' ? 'away' : 'home';
}

function nextRotation(rotation: number): number {
  return rotation === 6 ? 1 : rotation + 1;
}

function determinePointTeam(parsed: ParsedRally): TeamSide | null {
  if (parsed.pointTeam !== null) {
    return parsed.pointTeam;
  }

  const last = parsed.actions[parsed.actions.length - 1];
  if (!last) {
    return null;
  }

  if (last.effect === '#' && (last.skill === 'S' || last.skill === 'A' || last.skill === 'B')) {
    return last.team;
  }

  if (last.effect === '=') {
    return opposite(last.team);
  }

  return null;
}

export function deriveOutcome(parsed: ParsedRally, state: ScoringState): RallyOutcome {
  const pointTeam = determinePointTeam(parsed);

  if (pointTeam === null) {
    return { ...state, pointTeam: null };
  }

  const result: RallyOutcome = { ...state, pointTeam };

  if (pointTeam === 'home') {
    result.homeScore += 1;
  } else {
    result.awayScore += 1;
  }

  if (pointTeam !== state.servingTeam) {
    if (pointTeam === 'home') {
      result.rotationHome = nextRotation(state.rotationHome);
    } else {
      result.rotationAway = nextRotation(state.rotationAway);
    }
    result.servingTeam = pointTeam;
  }

  return result;
}

/**
 * `deriveOutcome` plus the manual rotation override (`I<n>`): overwrites the
 * serving team's rotation with `parsed.rotationSet` when present. Single
 * entry point for outcome computation, used by both new-rally submission and
 * rally-edit cascade recompute.
 */
export function computeRallyOutcome(parsed: ParsedRally, state: ScoringState): RallyOutcome {
  const outcome = deriveOutcome(parsed, state);

  if (parsed.rotationSet !== null) {
    if (outcome.servingTeam === 'home') {
      outcome.rotationHome = parsed.rotationSet;
    } else {
      outcome.rotationAway = parsed.rotationSet;
    }
  }

  return outcome;
}
