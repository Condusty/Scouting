import type Database from 'better-sqlite3';
import type { TeamPlayer, RosterEntryInput } from '@shared/types';
import { mapDbError } from './errors';

type RosterRow = Omit<TeamPlayer, 'is_libero' | 'is_setter'> & { is_libero: number; is_setter: number };

export function getRoster(db: Database.Database, teamId: number): TeamPlayer[] {
  const rows = db
    .prepare(
      `SELECT p.*, tp.shirt_number, tp.is_libero, tp.is_setter
       FROM team_players tp
       JOIN players p ON p.id = tp.player_id
       WHERE tp.team_id = ?
       ORDER BY tp.shirt_number`,
    )
    .all(teamId) as RosterRow[];
  return rows.map((r) => ({ ...r, is_libero: !!r.is_libero, is_setter: !!r.is_setter }));
}

export function addRosterPlayer(db: Database.Database, input: RosterEntryInput): TeamPlayer {
  try {
    db.prepare(
      `INSERT INTO team_players (team_id, player_id, shirt_number, is_libero, is_setter)
       VALUES (@team_id, @player_id, @shirt_number, @is_libero, @is_setter)`,
    ).run({
      team_id: input.team_id,
      player_id: input.player_id,
      shirt_number: input.shirt_number,
      is_libero: input.is_libero ? 1 : 0,
      is_setter: input.is_setter ? 1 : 0,
    });
  } catch (e) {
    return mapDbError(e, { entity: 'Aufstellung', field: 'Trikotnummer' });
  }
  return getRoster(db, input.team_id).find((p) => p.id === input.player_id)!;
}

export function updateRosterPlayer(
  db: Database.Database,
  teamId: number,
  playerId: number,
  fields: Partial<{ shirt_number: number; is_libero: boolean; is_setter: boolean }>,
): TeamPlayer {
  const out: Record<string, number> = {};
  if (fields.shirt_number != null) out.shirt_number = fields.shirt_number;
  if (fields.is_libero != null) out.is_libero = fields.is_libero ? 1 : 0;
  if (fields.is_setter != null) out.is_setter = fields.is_setter ? 1 : 0;
  const keys = Object.keys(out);
  if (keys.length > 0) {
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    try {
      db.prepare(`UPDATE team_players SET ${sets} WHERE team_id = @team_id AND player_id = @player_id`).run({
        ...out,
        team_id: teamId,
        player_id: playerId,
      });
    } catch (e) {
      return mapDbError(e, { entity: 'Aufstellung', field: 'Trikotnummer' });
    }
  }
  return getRoster(db, teamId).find((p) => p.id === playerId)!;
}

export function removeRosterPlayer(db: Database.Database, teamId: number, playerId: number): void {
  db.prepare('DELETE FROM team_players WHERE team_id = ? AND player_id = ?').run(teamId, playerId);
}
