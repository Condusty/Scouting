import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildSeedData } from './seed-data';
import { createTeam } from '../src/main/db/teams.repo';
import { createPlayer } from '../src/main/db/players.repo';
import { addRosterPlayer } from '../src/main/db/roster.repo';

const TABLES_TO_WIPE = [
  'rally_flags',
  'timeouts',
  'substitutions',
  'actions',
  'rallies',
  'sets',
  'matches',
  'team_players',
  'player_merges',
  'players',
  'team_merges',
  'season_teams',
  'teams',
  'seasons',
  'settings',
];

function applyMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM migrations').all() as { version: number }[]).map(
      (r) => r.version,
    ),
  );

  if (!applied.has(1)) {
    const sql = readFileSync(
      join(__dirname, '../src/main/db/migrations/001_initial.sql'),
      'utf-8',
    );
    db.exec(sql);
    db.prepare('INSERT INTO migrations(version) VALUES (1)').run();
  }
}

function wipeData(db: Database.Database): void {
  db.pragma('foreign_keys = OFF');
  for (const table of TABLES_TO_WIPE) {
    db.exec(`DELETE FROM ${table}`);
  }
  db.pragma('foreign_keys = ON');
}

function main(): void {
  const dbPath = join(process.cwd(), 'scouting.dev.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  applyMigrations(db);
  wipeData(db);

  const data = buildSeedData();

  const seasonResult = db
    .prepare(
      `INSERT INTO seasons (name, code, start_date, end_date, default_video_dir)
       VALUES (@name, @code, @start_date, @end_date, @default_video_dir)`,
    )
    .run(data.season);
  const seasonId = seasonResult.lastInsertRowid;

  let playerCount = 0;

  for (const teamSeed of data.teams) {
    const team = createTeam(db, teamSeed.team);
    db.prepare('INSERT INTO season_teams (season_id, team_id) VALUES (?, ?)').run(seasonId, team.id);

    for (const playerSeed of teamSeed.players) {
      const player = createPlayer(db, playerSeed.player);
      addRosterPlayer(db, {
        ...playerSeed.roster,
        team_id: team.id,
        player_id: player.id,
      });
      playerCount += 1;
    }
  }

  db.close();

  console.log(`Seeded 1 season, ${data.teams.length} teams, ${playerCount} players.`);
}

main();
