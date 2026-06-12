export type Skill = 'S' | 'R' | 'A' | 'B' | 'D' | 'E' | 'F';
export type Effect = '#' | '+' | '!' | '-' | '/' | '=';
export type TeamSide = 'home' | 'away';
export type Position = 'OH' | 'MB' | 'OPP' | 'S' | 'L' | 'DS';

export interface Season {
  id: number;
  name: string;
  code: string;
  start_date: string | null;
  end_date: string | null;
  default_video_dir: string | null;
  created_at: string;
}

export interface TeamRecord {
  id: number;
  name: string;
  code: string;
  coach: string | null;
  created_at: string;
}

export interface Player {
  id: number;
  code: string;
  first_name: string;
  last_name: string;
  position: Position | null;
  height_cm: number | null;
  weight_kg: number | null;
  reach_cm: number | null;
  photo_path: string | null;
  created_at: string;
}

export interface TeamPlayer extends Player {
  shirt_number: number;
  is_libero: boolean;
  is_setter: boolean;
}

export interface Match {
  id: number;
  season_id: number | null;
  home_team_id: number;
  away_team_id: number;
  match_date: string | null;
  venue: string | null;
  video_path: string | null;
  video_offset_ms: number;
  comment: string | null;
  dvw_source_file: string | null;
  created_at: string;
}

export interface Rally {
  id: number;
  match_id: number;
  set_number: number;
  rally_number: number;
  rotation_home: number | null;
  rotation_away: number | null;
  point_team: TeamSide | null;
  home_score_after: number | null;
  away_score_after: number | null;
  video_time_ms: number | null;
  raw_input: string | null;
}

export interface Action {
  id: number;
  rally_id: number;
  action_order: number;
  team: TeamSide;
  player_number: number | null;
  player_id: number | null;
  skill: Skill;
  skill_subtype: string | null;
  start_zone: number | null;
  end_zone: number | null;
  effect: Effect | null;
  linked_id: number | null;
  video_time_ms: number | null;
  raw_token: string | null;
}

export type CreateSeasonDTO  = Omit<Season,     'id' | 'created_at'>;
export type CreateTeamDTO    = Omit<TeamRecord, 'id' | 'created_at'>;
export type CreatePlayerDTO  = Omit<Player,     'id' | 'created_at'>;
export type CreateMatchDTO   = Omit<Match,      'id' | 'created_at'>;

export interface MatchRow extends Match {
  home_team_name: string;
  away_team_name: string;
}

export interface MatchDetail extends Match {
  home_team: TeamRecord;
  away_team: TeamRecord;
}

export interface RosterEntryInput {
  team_id: number;
  player_id: number;
  shirt_number: number;
  is_libero: boolean;
  is_setter: boolean;
}
