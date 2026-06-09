CREATE TABLE IF NOT EXISTS seasons (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  code             TEXT    NOT NULL UNIQUE,
  start_date       TEXT,
  end_date         TEXT,
  default_video_dir TEXT,
  created_at       TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  code       TEXT    NOT NULL UNIQUE,
  coach      TEXT,
  created_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS season_teams (
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id   INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
  PRIMARY KEY (season_id, team_id)
);

CREATE TABLE IF NOT EXISTS team_merges (
  old_id    INTEGER NOT NULL,
  new_id    INTEGER NOT NULL REFERENCES teams(id),
  merged_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL UNIQUE,
  first_name TEXT    NOT NULL,
  last_name  TEXT    NOT NULL,
  position   TEXT    CHECK(position IN ('OH','MB','OPP','S','L','DS',NULL)),
  height_cm  INTEGER,
  weight_kg  REAL,
  reach_cm   INTEGER,
  photo_path TEXT,
  created_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS player_merges (
  old_id    INTEGER NOT NULL,
  new_id    INTEGER NOT NULL REFERENCES players(id),
  merged_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_players (
  team_id      INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
  player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  shirt_number INTEGER NOT NULL,
  is_libero    INTEGER NOT NULL DEFAULT 0,
  is_setter    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (team_id, player_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_number
  ON team_players(team_id, shirt_number);

CREATE TABLE IF NOT EXISTS matches (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id        INTEGER REFERENCES seasons(id),
  home_team_id     INTEGER NOT NULL REFERENCES teams(id),
  away_team_id     INTEGER NOT NULL REFERENCES teams(id),
  match_date       TEXT,
  venue            TEXT,
  video_path       TEXT,
  video_offset_ms  INTEGER DEFAULT 0,
  comment          TEXT,
  dvw_source_file  TEXT,
  created_at       TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sets (
  match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number  INTEGER NOT NULL CHECK(set_number BETWEEN 1 AND 5),
  home_score  INTEGER NOT NULL DEFAULT 0,
  away_score  INTEGER NOT NULL DEFAULT 0,
  duration_min INTEGER,
  PRIMARY KEY (match_id, set_number)
);

CREATE TABLE IF NOT EXISTS rallies (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id             INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number           INTEGER NOT NULL,
  rally_number         INTEGER NOT NULL,
  rotation_home        INTEGER CHECK(rotation_home BETWEEN 1 AND 6),
  rotation_away        INTEGER CHECK(rotation_away BETWEEN 1 AND 6),
  point_team           TEXT    CHECK(point_team IN ('home','away', NULL)),
  home_score_after     INTEGER,
  away_score_after     INTEGER,
  video_time_ms        INTEGER,
  raw_input            TEXT,
  UNIQUE(match_id, set_number, rally_number)
);

CREATE INDEX IF NOT EXISTS idx_rallies_match ON rallies(match_id, set_number);

CREATE TABLE IF NOT EXISTS actions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  rally_id        INTEGER NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
  action_order    INTEGER NOT NULL,
  team            TEXT    NOT NULL CHECK(team IN ('home','away')),
  player_number   INTEGER,
  player_id       INTEGER REFERENCES players(id),
  skill           TEXT    NOT NULL CHECK(skill IN ('S','R','A','B','D','E','F')),
  skill_subtype   TEXT,
  start_zone      INTEGER CHECK(start_zone BETWEEN 1 AND 9),
  end_zone        INTEGER CHECK(end_zone BETWEEN 1 AND 9),
  effect          TEXT    CHECK(effect IN ('#','+','!','-','/','=', NULL)),
  linked_id       INTEGER REFERENCES actions(id),
  video_time_ms   INTEGER,
  raw_token       TEXT,
  UNIQUE(rally_id, action_order)
);

CREATE INDEX IF NOT EXISTS idx_actions_rally  ON actions(rally_id);
CREATE INDEX IF NOT EXISTS idx_actions_player ON actions(player_id);
CREATE INDEX IF NOT EXISTS idx_actions_skill  ON actions(skill, effect);

CREATE TABLE IF NOT EXISTS substitutions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id         INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number       INTEGER NOT NULL,
  after_rally      INTEGER NOT NULL,
  team             TEXT    NOT NULL CHECK(team IN ('home','away')),
  player_out_num   INTEGER NOT NULL,
  player_in_num    INTEGER NOT NULL,
  video_time_ms    INTEGER
);

CREATE TABLE IF NOT EXISTS timeouts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id      INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number    INTEGER NOT NULL,
  after_rally   INTEGER NOT NULL,
  team          TEXT    NOT NULL CHECK(team IN ('home','away')),
  video_time_ms INTEGER
);

CREATE TABLE IF NOT EXISTS rally_flags (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  rally_id     INTEGER NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
  flag_number  INTEGER NOT NULL CHECK(flag_number BETWEEN 1 AND 6),
  category     TEXT,
  note         TEXT,
  UNIQUE(rally_id, flag_number)
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
