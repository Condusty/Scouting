import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createTeam, listTeams, updateTeam, deleteTeam } from '../../src/main/db/teams.repo';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

describe('teams.repo', () => {
  it('creates and lists a team', () => {
    const db = freshDb();
    const t = createTeam(db, { name: 'VC Beispiel', code: 'VCB', coach: null });
    expect(t.id).toBeGreaterThan(0);
    expect(listTeams(db)).toHaveLength(1);
  });

  it('rejects duplicate code with friendly message', () => {
    const db = freshDb();
    createTeam(db, { name: 'A', code: 'VCB', coach: null });
    expect(() => createTeam(db, { name: 'B', code: 'VCB', coach: null })).toThrowError(/existiert bereits/);
  });

  it('updates a team', () => {
    const db = freshDb();
    const t = createTeam(db, { name: 'A', code: 'AAA', coach: null });
    const u = updateTeam(db, t.id, { coach: 'Trainer X' });
    expect(u.coach).toBe('Trainer X');
  });

  it('blocks delete when referenced by a match', () => {
    const db = freshDb();
    const home = createTeam(db, { name: 'H', code: 'HHH', coach: null });
    const away = createTeam(db, { name: 'V', code: 'VVV', coach: null });
    db.prepare('INSERT INTO matches (home_team_id, away_team_id) VALUES (?, ?)').run(home.id, away.id);
    expect(() => deleteTeam(db, home.id)).toThrowError(/verwendet/);
  });
});
