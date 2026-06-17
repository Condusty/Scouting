import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createTeam } from '../../src/main/db/teams.repo';
import { createPlayer } from '../../src/main/db/players.repo';
import { addRosterPlayer } from '../../src/main/db/roster.repo';
import { createMatch } from '../../src/main/db/matches.repo';
import {
  createRally,
  updateRally,
  listRallies,
  deleteRally,
  createSubstitution,
  createTimeout,
} from '../../src/main/db/scouting.repo';
import type {
  ParsedAction,
  CreateMatchDTO,
  CreateRallyDTO,
  CreateSubstitutionDTO,
  CreateTimeoutDTO,
  UpdateRallyDTO,
} from '@shared/types';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function baseMatch(home: number, away: number): CreateMatchDTO {
  return {
    season_id: null,
    home_team_id: home,
    away_team_id: away,
    match_date: '2026-01-15',
    venue: 'Halle 1',
    video_path: null,
    video_offset_ms: 0,
    comment: null,
    dvw_source_file: null,
  };
}

function baseRallyDto(matchId: number): CreateRallyDTO {
  return {
    matchId,
    setNumber: 1,
    rallyNumber: 1,
    rotationHome: 1,
    rotationAway: 1,
    pointTeam: 'home',
    homeScoreAfter: 1,
    awayScoreAfter: 0,
    rawInput: null,
  };
}

describe('scouting.repo', () => {
  let db: Database.Database;
  let matchId: number;
  let homePlayerId: number;
  let awayPlayerId: number;

  beforeEach(() => {
    db = freshDb();
    const home = createTeam(db, { name: 'Home', code: 'HOM', coach: null });
    const away = createTeam(db, { name: 'Away', code: 'AWY', coach: null });

    const homePlayer = createPlayer(db, {
      code: 'H7',
      first_name: 'Home',
      last_name: 'Seven',
      position: null,
      height_cm: null,
      weight_kg: null,
      reach_cm: null,
      photo_path: null,
    });
    const awayPlayer = createPlayer(db, {
      code: 'A3',
      first_name: 'Away',
      last_name: 'Three',
      position: null,
      height_cm: null,
      weight_kg: null,
      reach_cm: null,
      photo_path: null,
    });

    addRosterPlayer(db, {
      team_id: home.id,
      player_id: homePlayer.id,
      shirt_number: 7,
      is_libero: false,
      is_setter: false,
    });
    addRosterPlayer(db, {
      team_id: away.id,
      player_id: awayPlayer.id,
      shirt_number: 3,
      is_libero: false,
      is_setter: false,
    });

    homePlayerId = homePlayer.id;
    awayPlayerId = awayPlayer.id;

    const m = createMatch(db, baseMatch(home.id, away.id));
    matchId = m.id;
  });

  it('creates a rally with one action and resolves player_id from roster', () => {
    const actions: ParsedAction[] = [
      {
        team: 'home',
        playerNumber: 7,
        skill: 'R',
        skillSubtype: null,
        startZone: 1,
        endZone: null,
        effect: '#',
        rawToken: '7R#1',
      },
    ];

    const dto = baseRallyDto(matchId);
    const rally = createRally(db, dto, actions);

    expect(rally.match_id).toBe(matchId);
    expect(rally.set_number).toBe(1);
    expect(rally.rally_number).toBe(1);
    expect(rally.actions).toHaveLength(1);
    expect(rally.actions[0].player_number).toBe(7);
    expect(rally.actions[0].player_id).toBe(homePlayerId);
    expect(rally.actions[0].skill).toBe('R');
    expect(rally.actions[0].effect).toBe('#');
    expect(rally.actions[0].raw_token).toBe('7R#1');

    const fetched = listRallies(db, matchId, 1);
    expect(fetched).toHaveLength(1);
    expect(fetched[0].actions[0].player_id).toBe(homePlayerId);
    expect(fetched[0].actions[0].player_number).toBe(7);
  });

  it('sets player_id to null when shirt number has no roster entry', () => {
    const actions: ParsedAction[] = [
      {
        team: 'home',
        playerNumber: 99,
        skill: 'R',
        skillSubtype: null,
        startZone: 1,
        endZone: null,
        effect: '#',
        rawToken: '99R#1',
      },
    ];

    const dto = baseRallyDto(matchId);
    const rally = createRally(db, dto, actions);

    expect(rally.actions[0].player_id).toBeNull();
    expect(rally.actions[0].player_number).toBe(99);
  });

  it('links an attack to the opponent block via linked_id', () => {
    // '14A#5.a3B=' -> home attack #14 A # zone5, then away block #3 B =
    const actions: ParsedAction[] = [
      {
        team: 'home',
        playerNumber: 14,
        skill: 'A',
        skillSubtype: null,
        startZone: null,
        endZone: 5,
        effect: '#',
        rawToken: '14A#5',
      },
      {
        team: 'away',
        playerNumber: 3,
        skill: 'B',
        skillSubtype: null,
        startZone: null,
        endZone: null,
        effect: '=',
        rawToken: 'a3B=',
      },
    ];

    const dto = baseRallyDto(matchId);
    const rally = createRally(db, dto, actions);

    expect(rally.actions).toHaveLength(2);
    const [attack, block] = rally.actions;
    expect(attack.skill).toBe('A');
    expect(attack.player_id).toBeNull(); // #14 has no roster entry
    expect(block.skill).toBe('B');
    expect(block.player_id).toBe(awayPlayerId);
    expect(block.linked_id).toBe(attack.id);
  });

  it('deleteRally cascades to actions', () => {
    const actions: ParsedAction[] = [
      {
        team: 'home',
        playerNumber: 7,
        skill: 'R',
        skillSubtype: null,
        startZone: 1,
        endZone: null,
        effect: '#',
        rawToken: '7R#1',
      },
    ];

    const dto = baseRallyDto(matchId);
    const rally = createRally(db, dto, actions);

    deleteRally(db, rally.id);

    expect(listRallies(db, matchId, 1)).toEqual([]);
    const count = db.prepare('SELECT COUNT(*) AS c FROM actions').get() as { c: number };
    expect(count.c).toBe(0);
  });

  it('createSubstitution inserts exactly one row', () => {
    const dto: CreateSubstitutionDTO = {
      matchId,
      setNumber: 1,
      afterRally: 1,
      team: 'home',
      playerOutNum: 7,
      playerInNum: 8,
    };
    createSubstitution(db, dto);
    const count = db.prepare('SELECT COUNT(*) AS c FROM substitutions').get() as { c: number };
    expect(count.c).toBe(1);
  });

  it('createTimeout inserts exactly one row', () => {
    const dto: CreateTimeoutDTO = {
      matchId,
      setNumber: 1,
      afterRally: 1,
      team: 'away',
    };
    createTimeout(db, dto);
    const count = db.prepare('SELECT COUNT(*) AS c FROM timeouts').get() as { c: number };
    expect(count.c).toBe(1);
  });

  describe('updateRally', () => {
    it('replaces raw_input, scoring fields and actions', () => {
      const rally = createRally(db, baseRallyDto(matchId), [
        {
          team: 'home',
          playerNumber: 7,
          skill: 'R',
          skillSubtype: null,
          startZone: 1,
          endZone: null,
          effect: '#',
          rawToken: '7R#1',
        },
      ]);

      const dto: UpdateRallyDTO = {
        rotationHome: 2,
        rotationAway: 1,
        pointTeam: 'away',
        homeScoreAfter: 0,
        awayScoreAfter: 1,
        rawInput: 'a3A#5',
      };
      const newActions: ParsedAction[] = [
        {
          team: 'away',
          playerNumber: 3,
          skill: 'A',
          skillSubtype: null,
          startZone: null,
          endZone: 5,
          effect: '#',
          rawToken: 'a3A#5',
        },
      ];

      const [updated] = updateRally(db, rally.id, dto, newActions, [], [], []);

      expect(updated.raw_input).toBe('a3A#5');
      expect(updated.rotation_home).toBe(2);
      expect(updated.point_team).toBe('away');
      expect(updated.home_score_after).toBe(0);
      expect(updated.away_score_after).toBe(1);
      expect(updated.actions).toHaveLength(1);
      expect(updated.actions[0].skill).toBe('A');
      expect(updated.actions[0].player_id).toBe(awayPlayerId);
    });

    it('replaces substitutions and timeouts for the rally', () => {
      const rally = createRally(db, baseRallyDto(matchId), []);

      createSubstitution(db, {
        matchId,
        setNumber: 1,
        afterRally: rally.rally_number,
        team: 'home',
        playerOutNum: 7,
        playerInNum: 8,
      });
      createTimeout(db, {
        matchId,
        setNumber: 1,
        afterRally: rally.rally_number,
        team: 'away',
      });

      const dto: UpdateRallyDTO = {
        rotationHome: 1,
        rotationAway: 1,
        pointTeam: 'home',
        homeScoreAfter: 1,
        awayScoreAfter: 0,
        rawInput: '7R#1',
      };

      updateRally(
        db,
        rally.id,
        dto,
        [],
        [
          {
            matchId,
            setNumber: 1,
            afterRally: rally.rally_number,
            team: 'away',
            playerOutNum: 3,
            playerInNum: 4,
          },
        ],
        [],
        [],
      );

      const subs = db.prepare('SELECT * FROM substitutions').all() as { team: string; player_out_num: number }[];
      expect(subs).toHaveLength(1);
      expect(subs[0].team).toBe('away');
      expect(subs[0].player_out_num).toBe(3);

      const timeouts = db.prepare('SELECT * FROM timeouts').all();
      expect(timeouts).toHaveLength(0);
    });

    it('applies cascade scoring updates to following rallies without touching their raw_input', () => {
      const rally1 = createRally(db, baseRallyDto(matchId), []);
      const rally2 = createRally(db, { ...baseRallyDto(matchId), rallyNumber: 2, homeScoreAfter: 2 }, []);

      const dto: UpdateRallyDTO = {
        rotationHome: 1,
        rotationAway: 2,
        pointTeam: 'away',
        homeScoreAfter: 0,
        awayScoreAfter: 1,
        rawInput: 'a3A#5',
      };

      const result = updateRally(db, rally1.id, dto, [], [], [], [
        {
          id: rally2.id,
          rotationHome: 1,
          rotationAway: 2,
          pointTeam: 'away',
          homeScoreAfter: 0,
          awayScoreAfter: 2,
        },
      ]);

      expect(result).toHaveLength(2);
      const [updated1, updated2] = result;
      expect(updated1.id).toBe(rally1.id);
      expect(updated1.point_team).toBe('away');
      expect(updated2.id).toBe(rally2.id);
      expect(updated2.home_score_after).toBe(0);
      expect(updated2.away_score_after).toBe(2);
      expect(updated2.raw_input).toBe(rally2.raw_input);
    });
  });
});
