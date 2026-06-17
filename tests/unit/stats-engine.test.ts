import { describe, it, expect } from 'vitest';
import { buildMatchReport, buildServeFlows } from '@renderer/lib/stats-engine';
import type { Action, Rally } from '@shared/types';

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: 1, rally_id: 1, action_order: 0, team: 'home',
    player_number: 7, player_id: null, skill: 'S', skill_subtype: null,
    start_zone: null, end_zone: null, effect: null,
    linked_id: null, video_time_ms: null, raw_token: null,
    ...overrides,
  };
}

function makeRally(overrides: Partial<Rally> = {}): Rally {
  return {
    id: 1, match_id: 1, set_number: 1, rally_number: 1,
    rotation_home: 1, rotation_away: 1, point_team: null,
    home_score_after: 0, away_score_after: 0,
    video_time_ms: null, raw_input: null, actions: [],
    ...overrides,
  };
}

describe('buildMatchReport', () => {
  it('empty → all empty, no setScores', () => {
    const r = buildMatchReport([], []);
    expect(r.home).toEqual({});
    expect(r.away).toEqual({});
    expect(r.setScores).toEqual([]);
  });

  it('serve # → excellent+1, total+1, efficiency=1', () => {
    const { home } = buildMatchReport([makeAction({ effect: '#' })], []);
    expect(home.S!.team).toMatchObject({ excellent: 1, total: 1, efficiency: 1 });
  });

  it('serve = → error+1, total+1, efficiency=-1', () => {
    const { home } = buildMatchReport([makeAction({ effect: '=' })], []);
    expect(home.S!.team).toMatchObject({ error: 1, total: 1, efficiency: -1 });
  });

  it('all effects counted correctly', () => {
    const actions = ['#', '+', '!', '-', '/', '='].map(e => makeAction({ effect: e as Action['effect'] }));
    const { home } = buildMatchReport(actions, []);
    const s = home.S!.team;
    expect(s).toMatchObject({ excellent: 1, positive: 1, neutral: 1, negative: 1, freeball: 1, error: 1, total: 6 });
    expect(s.efficiency).toBeCloseTo(0);
  });

  it('byPlayer groups by playerNumber', () => {
    const actions = [
      makeAction({ player_number: 7, effect: '#' }),
      makeAction({ player_number: 7, effect: '+' }),
      makeAction({ player_number: 10, effect: '=' }),
    ];
    const { home } = buildMatchReport(actions, []);
    const players = home.S!.byPlayer;
    expect(players).toHaveLength(2);
    expect(players.find(p => p.playerNumber === 7)?.excellent).toBe(1);
    expect(players.find(p => p.playerNumber === 10)?.error).toBe(1);
  });

  it('away actions go to away report', () => {
    const { home, away } = buildMatchReport([makeAction({ team: 'away' })], []);
    expect(home).toEqual({});
    expect(away.S!.team.total).toBe(1);
  });

  it('setScores: last rally per set', () => {
    const rallies = [
      makeRally({ set_number: 1, rally_number: 1, home_score_after: 1, away_score_after: 0 }),
      makeRally({ set_number: 1, rally_number: 2, home_score_after: 1, away_score_after: 1 }),
      makeRally({ set_number: 2, rally_number: 1, home_score_after: 0, away_score_after: 1 }),
    ];
    const { setScores } = buildMatchReport([], rallies);
    expect(setScores).toEqual([
      { setNumber: 1, homeScore: 1, awayScore: 1 },
      { setNumber: 2, homeScore: 0, awayScore: 1 },
    ]);
  });
});

describe('buildServeFlows', () => {
  it('non-serve actions filtered out', () => {
    expect(buildServeFlows([makeAction({ skill: 'R' })])).toHaveLength(0);
  });

  it('groups by (startZone, endZone)', () => {
    const actions = [
      makeAction({ skill: 'S', start_zone: 1, end_zone: 5, effect: '#' }),
      makeAction({ skill: 'S', start_zone: 1, end_zone: 5, effect: '+' }),
      makeAction({ skill: 'S', start_zone: 1, end_zone: 6, effect: '=' }),
    ];
    const flows = buildServeFlows(actions);
    expect(flows).toHaveLength(2);
    expect(flows.find(f => f.endZone === 5)?.count).toBe(2);
    expect(flows.find(f => f.endZone === 5)?.excellentCount).toBe(1);
    expect(flows.find(f => f.endZone === 6)?.errorCount).toBe(1);
  });

  it('null zones do not crash', () => {
    const flows = buildServeFlows([makeAction({ skill: 'S', start_zone: null, end_zone: null })]);
    expect(flows).toHaveLength(1);
    expect(flows[0].count).toBe(1);
  });
});
