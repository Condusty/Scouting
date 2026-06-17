import type Database from 'better-sqlite3';
import type { Action, Rally } from '@shared/types';

export function listActionsForMatch(db: Database.Database, matchId: number): Action[] {
  return db
    .prepare(
      `SELECT a.* FROM actions a
       JOIN rallies r ON a.rally_id = r.id
       WHERE r.match_id = ?
       ORDER BY r.set_number, r.rally_number, a.action_order`,
    )
    .all(matchId) as Action[];
}

export function listRalliesForMatch(db: Database.Database, matchId: number): Rally[] {
  const rows = db
    .prepare('SELECT * FROM rallies WHERE match_id = ? ORDER BY set_number, rally_number')
    .all(matchId) as Omit<Rally, 'actions'>[];
  return rows.map((r) => ({ ...r, actions: [] }));
}
