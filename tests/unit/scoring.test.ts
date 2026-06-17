import { describe, it, expect } from 'vitest';
import { deriveOutcome, computeRallyOutcome } from '../../src/renderer/lib/scoring';
import type { ParsedAction, ParsedRally, ScoringState } from '../../src/shared/types';

function makeAction(overrides: Partial<ParsedAction>): ParsedAction {
  return {
    team: 'home',
    playerNumber: 1,
    skill: 'A',
    skillSubtype: null,
    startZone: null,
    endZone: null,
    startSubzone: null,
    endSubzone: null,
    effect: null,
    rawToken: '',
    ...overrides,
  };
}

function makeRally(overrides: Partial<ParsedRally>): ParsedRally {
  return {
    actions: [],
    subs: [],
    timeouts: [],
    pointTeam: null,
    rotationSet: null,
    rawInput: '',
    ...overrides,
  };
}

function initialState(overrides: Partial<ScoringState> = {}): ScoringState {
  return {
    homeScore: 0,
    awayScore: 0,
    rotationHome: 1,
    rotationAway: 1,
    servingTeam: 'home',
    ...overrides,
  };
}

describe('deriveOutcome', () => {
  it('serve ace home: own clean finish scores own team, no side-out', () => {
    const state = initialState();
    const parsed = makeRally({
      actions: [makeAction({ team: 'home', skill: 'S', effect: '#' })],
    });

    const result = deriveOutcome(parsed, state);

    expect(result).toEqual({
      homeScore: 1,
      awayScore: 0,
      rotationHome: 1,
      rotationAway: 1,
      servingTeam: 'home',
      pointTeam: 'home',
    });
  });

  it('reception error away: opposite team (serving team) scores, no side-out', () => {
    const state = initialState();
    const parsed = makeRally({
      actions: [makeAction({ team: 'away', skill: 'R', effect: '=' })],
    });

    const result = deriveOutcome(parsed, state);

    expect(result).toEqual({
      homeScore: 1,
      awayScore: 0,
      rotationHome: 1,
      rotationAway: 1,
      servingTeam: 'home',
      pointTeam: 'home',
    });
  });

  it('attack kill away while home serves: side-out, away rotates 1->2', () => {
    const state = initialState({ servingTeam: 'home' });
    const parsed = makeRally({
      actions: [makeAction({ team: 'away', skill: 'A', effect: '#' })],
    });

    const result = deriveOutcome(parsed, state);

    expect(result).toEqual({
      homeScore: 0,
      awayScore: 1,
      rotationHome: 1,
      rotationAway: 2,
      servingTeam: 'away',
      pointTeam: 'away',
    });
  });

  it('home attack error while home serves: side-out, away rotates 1->2', () => {
    const state = initialState({ servingTeam: 'home' });
    const parsed = makeRally({
      actions: [makeAction({ team: 'home', skill: 'A', effect: '=' })],
    });

    const result = deriveOutcome(parsed, state);

    expect(result).toEqual({
      homeScore: 0,
      awayScore: 1,
      rotationHome: 1,
      rotationAway: 2,
      servingTeam: 'away',
      pointTeam: 'away',
    });
  });

  it('manual point override: pointTeam set, no actions, no rotation change when pointTeam === servingTeam', () => {
    const state = initialState({ servingTeam: 'home' });
    const parsed = makeRally({
      actions: [],
      pointTeam: 'home',
    });

    const result = deriveOutcome(parsed, state);

    expect(result).toEqual({
      homeScore: 1,
      awayScore: 0,
      rotationHome: 1,
      rotationAway: 1,
      servingTeam: 'home',
      pointTeam: 'home',
    });
  });

  it('rotation wrap: rotationAway 6 -> 1 on side-out', () => {
    const state = initialState({ servingTeam: 'home', rotationAway: 6 });
    const parsed = makeRally({
      actions: [makeAction({ team: 'away', skill: 'A', effect: '#' })],
    });

    const result = deriveOutcome(parsed, state);

    expect(result).toEqual({
      homeScore: 0,
      awayScore: 1,
      rotationHome: 1,
      rotationAway: 1,
      servingTeam: 'away',
      pointTeam: 'away',
    });
  });

  it('no-op: neutral effect and no manual pointTeam returns state unchanged with pointTeam null', () => {
    const state = initialState();
    const parsed = makeRally({
      actions: [makeAction({ team: 'home', skill: 'A', effect: '+' })],
    });

    const result = deriveOutcome(parsed, state);

    expect(result).toEqual({
      ...state,
      pointTeam: null,
    });
  });

  it('empty actions and no manual pointTeam returns state unchanged with pointTeam null', () => {
    const state = initialState();
    const parsed = makeRally({ actions: [] });

    const result = deriveOutcome(parsed, state);

    expect(result).toEqual({
      ...state,
      pointTeam: null,
    });
  });
});

describe('computeRallyOutcome', () => {
  it('without rotationSet behaves like deriveOutcome', () => {
    const state = initialState();
    const parsed = makeRally({
      actions: [makeAction({ team: 'home', skill: 'S', effect: '#' })],
    });

    expect(computeRallyOutcome(parsed, state)).toEqual(deriveOutcome(parsed, state));
  });

  it('rotationSet overrides serving team rotation after side-out', () => {
    const state = initialState({ servingTeam: 'home', rotationAway: 3 });
    const parsed = makeRally({
      actions: [makeAction({ team: 'away', skill: 'A', effect: '#' })],
      rotationSet: 5,
    });

    const result = computeRallyOutcome(parsed, state);

    expect(result).toEqual({
      homeScore: 0,
      awayScore: 1,
      rotationHome: 1,
      rotationAway: 5,
      servingTeam: 'away',
      pointTeam: 'away',
    });
  });

  it('rotationSet overrides serving team rotation when serving team keeps serving', () => {
    const state = initialState({ servingTeam: 'home', rotationHome: 2 });
    const parsed = makeRally({
      actions: [makeAction({ team: 'home', skill: 'S', effect: '#' })],
      rotationSet: 4,
    });

    const result = computeRallyOutcome(parsed, state);

    expect(result).toEqual({
      homeScore: 1,
      awayScore: 0,
      rotationHome: 4,
      rotationAway: 1,
      servingTeam: 'home',
      pointTeam: 'home',
    });
  });
});
