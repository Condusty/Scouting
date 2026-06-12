import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createTeam } from '../../src/main/db/teams.repo';
import { createPlayer } from '../../src/main/db/players.repo';
import { addRosterPlayer, getRoster, updateRosterPlayer, removeRosterPlayer } from '../../src/main/db/roster.repo';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function seed(db: Database.Database) {
  const team = createTeam(db, { name: 'T', code: 'TTT', coach: null });
  const player = createPlayer(db, {
    code: 'AAA-BBB',
    first_name: 'A',
    last_name: 'B',
    position: 'S',
    height_cm: null,
    weight_kg: null,
    reach_cm: null,
    photo_path: null,
  });
  return { team, player };
}

describe('roster.repo', () => {
  it('adds a player to a roster and reads booleans back', () => {
    const db = freshDb();
    const { team, player } = seed(db);
    const tp = addRosterPlayer(db, {
      team_id: team.id,
      player_id: player.id,
      shirt_number: 7,
      is_libero: false,
      is_setter: true,
    });
    expect(tp.shirt_number).toBe(7);
    expect(tp.is_setter).toBe(true);
    expect(tp.is_libero).toBe(false);
    expect(getRoster(db, team.id)).toHaveLength(1);
  });

  it('rejects duplicate shirt number in the same team', () => {
    const db = freshDb();
    const { team, player } = seed(db);
    const p2 = createPlayer(db, {
      code: 'CCC-DDD',
      first_name: 'C',
      last_name: 'D',
      position: null,
      height_cm: null,
      weight_kg: null,
      reach_cm: null,
      photo_path: null,
    });
    addRosterPlayer(db, { team_id: team.id, player_id: player.id, shirt_number: 7, is_libero: false, is_setter: false });
    expect(() =>
      addRosterPlayer(db, { team_id: team.id, player_id: p2.id, shirt_number: 7, is_libero: false, is_setter: false }),
    ).toThrowError(/existiert bereits/);
  });

  it('updates and removes a roster entry', () => {
    const db = freshDb();
    const { team, player } = seed(db);
    addRosterPlayer(db, { team_id: team.id, player_id: player.id, shirt_number: 7, is_libero: false, is_setter: false });
    const upd = updateRosterPlayer(db, team.id, player.id, { is_libero: true, shirt_number: 9 });
    expect(upd.is_libero).toBe(true);
    expect(upd.shirt_number).toBe(9);
    removeRosterPlayer(db, team.id, player.id);
    expect(getRoster(db, team.id)).toHaveLength(0);
  });
});
