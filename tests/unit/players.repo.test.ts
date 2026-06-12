import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createPlayer, listPlayers, updatePlayer } from '../../src/main/db/players.repo';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

const base = {
  code: 'SMI-JOH',
  first_name: 'John',
  last_name: 'Smith',
  position: 'OH' as const,
  height_cm: 190,
  weight_kg: 82,
  reach_cm: 340,
  photo_path: null,
};

describe('players.repo', () => {
  it('creates and lists a player', () => {
    const db = freshDb();
    const p = createPlayer(db, base);
    expect(p.id).toBeGreaterThan(0);
    expect(listPlayers(db)).toHaveLength(1);
  });

  it('rejects duplicate code', () => {
    const db = freshDb();
    createPlayer(db, base);
    expect(() => createPlayer(db, { ...base, first_name: 'Jane' })).toThrowError(/existiert bereits/);
  });

  it('rejects invalid position', () => {
    const db = freshDb();
    expect(() => createPlayer(db, { ...base, position: 'ZZ' as never })).toThrowError(/Position/);
  });

  it('updates a player', () => {
    const db = freshDb();
    const p = createPlayer(db, base);
    const u = updatePlayer(db, p.id, { height_cm: 195 });
    expect(u.height_cm).toBe(195);
  });
});
