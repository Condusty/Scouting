import { describe, it, expect } from 'vitest';
import { parseCode } from '../../src/renderer/lib/code-parser';
import { validateRally } from '../../src/renderer/lib/code-validator';
import type { ScoutingSession, TeamPlayer } from '../../src/shared/types';

function makePlayer(shirt_number: number): TeamPlayer {
  return {
    id: shirt_number,
    code: `P${shirt_number}`,
    first_name: 'A',
    last_name: 'B',
    position: null,
    height_cm: null,
    weight_kg: null,
    reach_cm: null,
    photo_path: null,
    created_at: '',
    shirt_number,
    is_libero: false,
    is_setter: false,
  };
}

function makeSession(): ScoutingSession {
  return {
    matchId: 1,
    setNumber: 1,
    homeScore: 0,
    awayScore: 0,
    rotationHome: 1,
    rotationAway: 1,
    servingTeam: 'home',
    homeTeamId: 1,
    awayTeamId: 2,
    homeTeamName: 'Heim',
    awayTeamName: 'Gast',
    homeRoster: [makePlayer(7), makePlayer(14)],
    awayRoster: [makePlayer(3), makePlayer(10)],
    homeLineup: [],
    awayLineup: [],
  };
}

describe('validateRally', () => {
  it('returns an error when a shirt number is not in the roster', () => {
    const session = makeSession();
    const parsed = parseCode('a99A#5');

    const errors = validateRally(parsed, session);

    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe('a99A#5');
    expect(errors[0].message).toMatch(/Roster|Nummer|number/i);
    expect(errors[0].position).toBe(parsed.rawInput.indexOf('a99A#5'));
  });

  it('returns an error when the first action is a Block without a preceding attack/serve', () => {
    const session = makeSession();
    const parsed = parseCode('14B#5');

    const errors = validateRally(parsed, session);

    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe('14B#5');
    expect(errors[0].position).toBe(parsed.rawInput.indexOf('14B#5'));
  });

  it('returns an error when the first action is a Dig without a preceding attack/serve', () => {
    const session = makeSession();
    const parsed = parseCode('14D#5');

    const errors = validateRally(parsed, session);

    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe('14D#5');
  });

  it('returns an empty array for a valid rally', () => {
    const session = makeSession();
    const parsed = parseCode('14SQ#5');

    const errors = validateRally(parsed, session);

    expect(errors).toEqual([]);
  });

  it('returns an error when a sub references an "out" shirt number not in the roster', () => {
    const session = makeSession();
    const parsed = parseCode('C99:14');

    const errors = validateRally(parsed, session);

    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe('C99:14');
    expect(errors[0].message).toMatch(/Roster|Nummer|number/i);
    expect(errors[0].position).toBe(parsed.rawInput.indexOf('C99:14'));
  });

  it('collects multiple violations in token order', () => {
    const session = makeSession();
    const parsed = parseCode('99B#5.a99A#1');

    const errors = validateRally(parsed, session);

    expect(errors).toHaveLength(3);
    expect(errors[0].token).toBe('99B#5');
    expect(errors[1].token).toBe('99B#5');
    expect(errors[2].token).toBe('a99A#1');

    // Errors are in token order (by position within rawInput)
    expect(errors[0].position).toBeLessThanOrEqual(errors[1].position);
    expect(errors[1].position).toBeLessThanOrEqual(errors[2].position);
  });
});
