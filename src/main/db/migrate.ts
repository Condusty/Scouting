import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  const migrations = [
    { version: 1, file: '001_initial.sql' },
  ];

  const applied = new Set(
    (db.prepare('SELECT version FROM migrations').all() as { version: number }[])
      .map(r => r.version)
  );

  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    const sql = readFileSync(join(__dirname, 'migrations', m.file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO migrations(version) VALUES (?)').run(m.version);
  }
}
