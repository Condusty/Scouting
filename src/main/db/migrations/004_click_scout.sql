ALTER TABLE matches ADD COLUMN scouting_mode TEXT NOT NULL DEFAULT 'code'
  CHECK(scouting_mode IN ('code','click'));

ALTER TABLE substitutions ADD COLUMN is_libero INTEGER NOT NULL DEFAULT 0;
