import type Database from 'better-sqlite3';
import type { Player, CreatePlayerDTO, Position } from '@shared/types';
import { mapDbError } from './errors';

const POSITIONS: Position[] = ['OH', 'MB', 'OPP', 'S', 'L', 'DS'];

function assertPosition(pos: Position | null): void {
  if (pos != null && !POSITIONS.includes(pos)) {
    throw new Error('Spieler: ungültige Position.');
  }
}

export function getPlayer(db: Database.Database, id: number): Player {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id) as Player;
}

export function listPlayers(db: Database.Database): Player[] {
  return db.prepare('SELECT * FROM players ORDER BY last_name, first_name').all() as Player[];
}

export function createPlayer(db: Database.Database, dto: CreatePlayerDTO): Player {
  assertPosition(dto.position);
  try {
    const r = db
      .prepare(
        `INSERT INTO players (code, first_name, last_name, position, height_cm, weight_kg, reach_cm, photo_path)
         VALUES (@code, @first_name, @last_name, @position, @height_cm, @weight_kg, @reach_cm, @photo_path)`,
      )
      .run(dto);
    return getPlayer(db, Number(r.lastInsertRowid));
  } catch (e) {
    return mapDbError(e, { entity: 'Spieler', field: 'Code' });
  }
}

export function updatePlayer(
  db: Database.Database,
  id: number,
  fields: Partial<Omit<Player, 'id' | 'created_at'>>,
): Player {
  if (fields.position !== undefined) assertPosition(fields.position);
  const keys = Object.keys(fields);
  if (keys.length === 0) return getPlayer(db, id);
  const sets = keys.map((k) => `${k} = @${k}`).join(', ');
  try {
    db.prepare(`UPDATE players SET ${sets} WHERE id = @id`).run({ ...fields, id });
    return getPlayer(db, id);
  } catch (e) {
    return mapDbError(e, { entity: 'Spieler', field: 'Code' });
  }
}

export function deletePlayer(db: Database.Database, id: number): void {
  try {
    db.prepare('DELETE FROM players WHERE id = ?').run(id);
  } catch (e) {
    mapDbError(e, { entity: 'Spieler' });
  }
}
