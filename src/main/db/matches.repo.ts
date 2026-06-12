import type Database from 'better-sqlite3';
import type { Match, MatchRow, MatchDetail, TeamRecord, CreateMatchDTO } from '@shared/types';
import { mapDbError } from './errors';

function assertDistinct(home: number, away: number): void {
  if (home === away) {
    throw new Error('Spiel: Heim- und Gastteam müssen unterschiedlich sein.');
  }
}

export function getMatch(db: Database.Database, id: number): MatchDetail {
  const m = db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as Match;
  const home = db.prepare('SELECT * FROM teams WHERE id = ?').get(m.home_team_id) as TeamRecord;
  const away = db.prepare('SELECT * FROM teams WHERE id = ?').get(m.away_team_id) as TeamRecord;
  return { ...m, home_team: home, away_team: away };
}

export function listMatches(db: Database.Database, seasonId?: number): MatchRow[] {
  const where = seasonId != null ? 'WHERE m.season_id = ?' : '';
  const sql = `
    SELECT m.*, h.name AS home_team_name, v.name AS away_team_name
    FROM matches m
    JOIN teams h ON h.id = m.home_team_id
    JOIN teams v ON v.id = m.away_team_id
    ${where}
    ORDER BY m.match_date DESC, m.id DESC
  `;
  const stmt = db.prepare(sql);
  return (seasonId != null ? stmt.all(seasonId) : stmt.all()) as MatchRow[];
}

export function createMatch(db: Database.Database, dto: CreateMatchDTO): MatchDetail {
  assertDistinct(dto.home_team_id, dto.away_team_id);
  try {
    const r = db
      .prepare(
        `INSERT INTO matches
          (season_id, home_team_id, away_team_id, match_date, venue, video_path, video_offset_ms, comment, dvw_source_file)
         VALUES
          (@season_id, @home_team_id, @away_team_id, @match_date, @venue, @video_path, @video_offset_ms, @comment, @dvw_source_file)`,
      )
      .run(dto);
    return getMatch(db, Number(r.lastInsertRowid));
  } catch (e) {
    return mapDbError(e, { entity: 'Spiel' });
  }
}

export function updateMatch(db: Database.Database, id: number, fields: Partial<Match>): MatchDetail {
  const cur = db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as Match;
  const home = fields.home_team_id ?? cur.home_team_id;
  const away = fields.away_team_id ?? cur.away_team_id;
  assertDistinct(home, away);
  const keys = Object.keys(fields);
  if (keys.length > 0) {
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    try {
      db.prepare(`UPDATE matches SET ${sets} WHERE id = @id`).run({ ...fields, id });
    } catch (e) {
      return mapDbError(e, { entity: 'Spiel' });
    }
  }
  return getMatch(db, id);
}

export function deleteMatch(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM matches WHERE id = ?').run(id);
}
