import type Database from 'better-sqlite3';
import type { Rally, Action, ParsedAction, TeamSide } from '@shared/types';
import { mapDbError } from './errors';

export interface CreateRallyDTO {
  matchId: number;
  setNumber: number;
  rallyNumber: number;
  rotationHome: number | null;
  rotationAway: number | null;
  pointTeam: TeamSide | null;
  homeScoreAfter: number | null;
  awayScoreAfter: number | null;
  rawInput: string | null;
}

export interface CreateSubstitutionDTO {
  matchId: number;
  setNumber: number;
  afterRally: number;
  team: TeamSide;
  playerOutNum: number;
  playerInNum: number;
}

export interface CreateTimeoutDTO {
  matchId: number;
  setNumber: number;
  afterRally: number;
  team: TeamSide;
}

function getRally(db: Database.Database, id: number): Rally {
  const rally = db.prepare('SELECT * FROM rallies WHERE id = ?').get(id) as Rally;
  const actions = db
    .prepare('SELECT * FROM actions WHERE rally_id = ? ORDER BY action_order')
    .all(id) as Action[];
  return { ...rally, actions };
}

export function createRally(db: Database.Database, dto: CreateRallyDTO, actions: ParsedAction[]): Rally {
  const insertRally = db.prepare(
    `INSERT INTO rallies
      (match_id, set_number, rally_number, rotation_home, rotation_away, point_team, home_score_after, away_score_after, raw_input)
     VALUES
      (@match_id, @set_number, @rally_number, @rotation_home, @rotation_away, @point_team, @home_score_after, @away_score_after, @raw_input)`,
  );

  const insertAction = db.prepare(
    `INSERT INTO actions
      (rally_id, action_order, team, player_number, player_id, skill, skill_subtype, start_zone, end_zone, effect, linked_id, raw_token)
     VALUES
      (@rally_id, @action_order, @team, @player_number, @player_id, @skill, @skill_subtype, @start_zone, @end_zone, @effect, @linked_id, @raw_token)`,
  );

  const updateLinkedId = db.prepare('UPDATE actions SET linked_id = ? WHERE id = ?');

  const getMatchTeams = db.prepare('SELECT home_team_id, away_team_id FROM matches WHERE id = ?');
  const getPlayerId = db.prepare('SELECT player_id FROM team_players WHERE team_id = ? AND shirt_number = ?');

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

      const match = getMatchTeams.get(dto.matchId) as { home_team_id: number; away_team_id: number } | undefined;

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

      return rallyId;
    } catch (e) {
      return mapDbError(e, { entity: 'Ballwechsel' });
    }
  });

  const rallyId = run();
  return getRally(db, rallyId);
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
      `INSERT INTO substitutions (match_id, set_number, after_rally, team, player_out_num, player_in_num)
       VALUES (@match_id, @set_number, @after_rally, @team, @player_out_num, @player_in_num)`,
    ).run({
      match_id: dto.matchId,
      set_number: dto.setNumber,
      after_rally: dto.afterRally,
      team: dto.team,
      player_out_num: dto.playerOutNum,
      player_in_num: dto.playerInNum,
    });
  } catch (e) {
    mapDbError(e, { entity: 'Wechsel' });
  }
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
