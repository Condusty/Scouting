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
