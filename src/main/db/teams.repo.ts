import type Database from 'better-sqlite3';
import type { TeamRecord, CreateTeamDTO } from '@shared/types';
import { mapDbError } from './errors';

export function getTeam(db: Database.Database, id: number): TeamRecord {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as TeamRecord;
}

export function listTeams(db: Database.Database, seasonId?: number): TeamRecord[] {
  if (seasonId != null) {
    return db
      .prepare(
        `SELECT t.* FROM teams t
         JOIN season_teams st ON st.team_id = t.id
         WHERE st.season_id = ?
         ORDER BY t.name`,
      )
      .all(seasonId) as TeamRecord[];
  }
  return db.prepare('SELECT * FROM teams ORDER BY name').all() as TeamRecord[];
}

export function createTeam(db: Database.Database, dto: CreateTeamDTO): TeamRecord {
  try {
    const r = db
      .prepare('INSERT INTO teams (name, code, coach) VALUES (@name, @code, @coach)')
      .run(dto);
    return getTeam(db, Number(r.lastInsertRowid));
  } catch (e) {
    return mapDbError(e, { entity: 'Team', field: 'Code' });
  }
}

export function updateTeam(
  db: Database.Database,
  id: number,
  fields: Partial<Omit<TeamRecord, 'id' | 'created_at'>>,
): TeamRecord {
  const keys = Object.keys(fields);
  if (keys.length === 0) return getTeam(db, id);
  const sets = keys.map((k) => `${k} = @${k}`).join(', ');
  try {
    db.prepare(`UPDATE teams SET ${sets} WHERE id = @id`).run({ ...fields, id });
    return getTeam(db, id);
  } catch (e) {
    return mapDbError(e, { entity: 'Team', field: 'Code' });
  }
}

export function deleteTeam(db: Database.Database, id: number): void {
  try {
    db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  } catch (e) {
    mapDbError(e, { entity: 'Team' });
  }
}
