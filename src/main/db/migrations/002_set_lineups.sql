ALTER TABLE sets ADD COLUMN home_lineup  TEXT;
ALTER TABLE sets ADD COLUMN away_lineup  TEXT;
ALTER TABLE sets ADD COLUMN serving_team TEXT CHECK(serving_team IN ('home','away',NULL));
