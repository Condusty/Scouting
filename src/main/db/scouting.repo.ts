import type Database from 'better-sqlite3';
import type {
  Rally,
  Action,
  ParsedAction,
  CreateRallyDTO,
  UpdateRallyDTO,
  RallyScoringUpdate,
  CreateSubstitutionDTO,
  CreateTimeoutDTO,
  SetRecord,
  UpsertSetDTO,
} from '@shared/types';
import { mapDbError } from './errors';

function getRally(db: Database.Database, id: number): Rally {
  const rally = db.prepare('SELECT * FROM rallies WHERE id = ?').get(id) as Rally;
  const actions = db
    .prepare('SELECT * FROM actions WHERE rally_id = ? ORDER BY action_order')
    .all(id) as Action[];
  return { ...rally, actions };
}

/**
 * Inserts a rally's actions in order, resolving `player_id` from the roster
 * and linking an attack to the opponent's block via `linked_id`.
 */
function insertActions(db: Database.Database, rallyId: number, matchId: number, actions: ParsedAction[]): void {
  const insertAction = db.prepare(
    `INSERT INTO actions
      (rally_id, action_order, team, player_number, player_id, skill, skill_subtype, start_zone, end_zone, start_subzone, end_subzone, effect, linked_id, raw_token)
     VALUES
      (@rally_id, @action_order, @team, @player_number, @player_id, @skill, @skill_subtype, @start_zone, @end_zone, @start_subzone, @end_subzone, @effect, @linked_id, @raw_token)`,
  );

  const updateLinkedId = db.prepare('UPDATE actions SET linked_id = ? WHERE id = ?');

  const getMatchTeams = db.prepare('SELECT home_team_id, away_team_id FROM matches WHERE id = ?');
  const getPlayerId = db.prepare('SELECT player_id FROM team_players WHERE team_id = ? AND shirt_number = ?');

  const match = getMatchTeams.get(matchId) as { home_team_id: number; away_team_id: number } | undefined;

  let previousAction: ParsedAction | null = null;
  let previousActionId: number | null = null;

  actions.forEach((action, index) => {
    let playerId: number | null = null;
    if (match) {
      const teamId = action.team === 'home' ? match.home_team_id : match.away_team_id;
      const row = getPlayerId.get(teamId, action.playerNumber) as { player_id: number } | undefined;
      if (row) playerId = row.player_id;
    }

    const result = insertAction.run({
      rally_id: rallyId,
      action_order: index,
      team: action.team,
      player_number: action.playerNumber,
      player_id: playerId,
      skill: action.skill,
      skill_subtype: action.skillSubtype,
      start_zone: action.startZone,
      end_zone: action.endZone,
      start_subzone: action.startSubzone ?? null,
      end_subzone: action.endSubzone ?? null,
      effect: action.effect,
      linked_id: null,
      raw_token: action.rawToken,
    });
    const actionId = Number(result.lastInsertRowid);

    if (
      previousAction &&
      previousAction.skill === 'A' &&
      action.skill === 'B' &&
      action.team !== previousAction.team &&
      previousActionId != null
    ) {
      updateLinkedId.run(previousActionId, actionId);
    }

    previousAction = action;
    previousActionId = actionId;
  });
}

export function createRally(db: Database.Database, dto: CreateRallyDTO, actions: ParsedAction[]): Rally {
  const insertRally = db.prepare(
    `INSERT INTO rallies
      (match_id, set_number, rally_number, rotation_home, rotation_away, point_team, home_score_after, away_score_after, raw_input)
     VALUES
      (@match_id, @set_number, @rally_number, @rotation_home, @rotation_away, @point_team, @home_score_after, @away_score_after, @raw_input)`,
  );

  const run = db.transaction(() => {
    try {
      const r = insertRally.run({
        match_id: dto.matchId,
        set_number: dto.setNumber,
        rally_number: dto.rallyNumber,
        rotation_home: dto.rotationHome,
        rotation_away: dto.rotationAway,
        point_team: dto.pointTeam,
        home_score_after: dto.homeScoreAfter,
        away_score_after: dto.awayScoreAfter,
        raw_input: dto.rawInput,
      });
      const rallyId = Number(r.lastInsertRowid);

      insertActions(db, rallyId, dto.matchId, actions);

      return rallyId;
    } catch (e) {
      return mapDbError(e, { entity: 'Ballwechsel' });
    }
  });

  const rallyId = run();
  return getRally(db, rallyId);
}

/**
 * Replaces a rally's code (actions/subs/timeouts/scoring) and applies
 * re-scoring updates to all following rallies in the same cascade. All
 * changes are applied in a single transaction.
 */
export function updateRally(
  db: Database.Database,
  id: number,
  dto: UpdateRallyDTO,
  actions: ParsedAction[],
  subs: CreateSubstitutionDTO[],
  timeouts: CreateTimeoutDTO[],
  cascade: RallyScoringUpdate[],
): Rally[] {
  const updateRallyRow = db.prepare(
    `UPDATE rallies SET
       rotation_home = @rotation_home,
       rotation_away = @rotation_away,
       point_team = @point_team,
       home_score_after = @home_score_after,
       away_score_after = @away_score_after,
       raw_input = @raw_input
     WHERE id = @id`,
  );

  const updateCascadeRow = db.prepare(
    `UPDATE rallies SET
       rotation_home = @rotation_home,
       rotation_away = @rotation_away,
       point_team = @point_team,
       home_score_after = @home_score_after,
       away_score_after = @away_score_after
     WHERE id = @id`,
  );

  const deleteActions = db.prepare('DELETE FROM actions WHERE rally_id = ?');
  const deleteSubs = db.prepare('DELETE FROM substitutions WHERE match_id = ? AND set_number = ? AND after_rally = ?');
  const deleteTimeouts = db.prepare('DELETE FROM timeouts WHERE match_id = ? AND set_number = ? AND after_rally = ?');

  const run = db.transaction(() => {
    const rally = db.prepare('SELECT match_id, set_number, rally_number FROM rallies WHERE id = ?').get(id) as
      | { match_id: number; set_number: number; rally_number: number }
      | undefined;
    if (!rally) {
      throw new Error('Ballwechsel: nicht gefunden.');
    }

    try {
      updateRallyRow.run({
        id,
        rotation_home: dto.rotationHome,
        rotation_away: dto.rotationAway,
        point_team: dto.pointTeam,
        home_score_after: dto.homeScoreAfter,
        away_score_after: dto.awayScoreAfter,
        raw_input: dto.rawInput,
      });

      deleteActions.run(id);
      insertActions(db, id, rally.match_id, actions);

      deleteSubs.run(rally.match_id, rally.set_number, rally.rally_number);
      for (const sub of subs) {
        createSubstitution(db, sub);
      }

      deleteTimeouts.run(rally.match_id, rally.set_number, rally.rally_number);
      for (const timeout of timeouts) {
        createTimeout(db, timeout);
      }

      for (const c of cascade) {
        updateCascadeRow.run({
          id: c.id,
          rotation_home: c.rotationHome,
          rotation_away: c.rotationAway,
          point_team: c.pointTeam,
          home_score_after: c.homeScoreAfter,
          away_score_after: c.awayScoreAfter,
        });
      }

      return [id, ...cascade.map((c) => c.id)];
    } catch (e) {
      return mapDbError(e, { entity: 'Ballwechsel' });
    }
  });

  const ids = run();
  return ids.map((rallyId) => getRally(db, rallyId));
}

export function listRallies(db: Database.Database, matchId: number, setNumber: number): Rally[] {
  const rallies = db
    .prepare('SELECT * FROM rallies WHERE match_id = ? AND set_number = ? ORDER BY rally_number')
    .all(matchId, setNumber) as Rally[];

  const getActions = db.prepare('SELECT * FROM actions WHERE rally_id = ? ORDER BY action_order');

  return rallies.map((rally) => ({
    ...rally,
    actions: getActions.all(rally.id) as Action[],
  }));
}

export function deleteRally(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM rallies WHERE id = ?').run(id);
}

export function createSubstitution(db: Database.Database, dto: CreateSubstitutionDTO): void {
  try {
    db.prepare(
      `INSERT INTO substitutions (match_id, set_number, after_rally, team, player_out_num, player_in_num, is_libero)
       VALUES (@match_id, @set_number, @after_rally, @team, @player_out_num, @player_in_num, @is_libero)`,
    ).run({
      match_id: dto.matchId,
      set_number: dto.setNumber,
      after_rally: dto.afterRally,
      team: dto.team,
      player_out_num: dto.playerOutNum,
      player_in_num: dto.playerInNum,
      is_libero: dto.isLibero ? 1 : 0,
    });
  } catch (e) {
    mapDbError(e, { entity: 'Wechsel' });
  }
}

export function upsertSet(db: Database.Database, dto: UpsertSetDTO): void {
  db.prepare(
    `INSERT INTO sets (match_id, set_number, home_score, away_score, home_lineup, away_lineup, serving_team)
     VALUES (@match_id, @set_number, 0, 0, @home_lineup, @away_lineup, @serving_team)
     ON CONFLICT(match_id, set_number) DO UPDATE SET
       home_lineup  = excluded.home_lineup,
       away_lineup  = excluded.away_lineup,
       serving_team = excluded.serving_team`,
  ).run({
    match_id:     dto.matchId,
    set_number:   dto.setNumber,
    home_lineup:  JSON.stringify(dto.homeLineup),
    away_lineup:  JSON.stringify(dto.awayLineup),
    serving_team: dto.servingTeam,
  });
}

export function getSetsForMatch(db: Database.Database, matchId: number): SetRecord[] {
  return db
    .prepare('SELECT * FROM sets WHERE match_id = ? ORDER BY set_number')
    .all(matchId) as SetRecord[];
}

export function createTimeout(db: Database.Database, dto: CreateTimeoutDTO): void {
  try {
    db.prepare(
      `INSERT INTO timeouts (match_id, set_number, after_rally, team)
       VALUES (@match_id, @set_number, @after_rally, @team)`,
    ).run({
      match_id: dto.matchId,
      set_number: dto.setNumber,
      after_rally: dto.afterRally,
      team: dto.team,
    });
  } catch (e) {
    mapDbError(e, { entity: 'Auszeit' });
  }
}
