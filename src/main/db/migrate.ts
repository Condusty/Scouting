import Database from 'better-sqlite3';
import migration001 from './migrations/001_initial.sql?raw';
import migration002 from './migrations/002_set_lineups.sql?raw';
import migration003 from './migrations/003_subzones.sql?raw';
import migration004 from './migrations/004_click_scout.sql?raw';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  const migrations = [
    { version: 1, sql: migration001 },
    { version: 2, sql: migration002 },
    { version: 3, sql: migration003 },
    { version: 4, sql: migration004 },
  ];

  const applied = new Set(
    (db.prepare('SELECT version FROM migrations').all() as { version: number }[])
      .map(r => r.version)
  );

  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    db.exec(m.sql);
    db.prepare('INSERT INTO migrations(version) VALUES (?)').run(m.version);
  }
}
