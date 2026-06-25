import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';
import { createTeam } from '../../src/main/db/teams.repo';
import { createMatch, listMatches, getMatch } from '../../src/main/db/matches.repo';
import type { CreateMatchDTO } from '@shared/types';

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
    scouting_mode: 'code',
  };
}

describe('matches.repo', () => {
  it('creates a match and lists it with team names', () => {
    const db = freshDb();
    const h = createTeam(db, { name: 'Home', code: 'HOM', coach: null });
    const a = createTeam(db, { name: 'Away', code: 'AWY', coach: null });
    const m = createMatch(db, baseMatch(h.id, a.id));
    expect(m.home_team.name).toBe('Home');
    const rows = listMatches(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].home_team_name).toBe('Home');
    expect(rows[0].away_team_name).toBe('Away');
  });

  it('rejects a match where home equals away', () => {
    const db = freshDb();
    const t = createTeam(db, { name: 'T', code: 'TTT', coach: null });
    expect(() => createMatch(db, baseMatch(t.id, t.id))).toThrowError(/unterschiedlich/);
  });

  it('reads a match detail with both teams', () => {
    const db = freshDb();
    const h = createTeam(db, { name: 'Home', code: 'HOM', coach: null });
    const a = createTeam(db, { name: 'Away', code: 'AWY', coach: null });
    const m = createMatch(db, baseMatch(h.id, a.id));
    const detail = getMatch(db, m.id);
    expect(detail.away_team.code).toBe('AWY');
  });
});
