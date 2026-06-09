import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { runMigrations } from './migrate';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = app.isPackaged
    ? join(app.getPath('userData'), 'scouting.db')
    : join(process.cwd(), 'scouting.dev.db');

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  runMigrations(_db);

  return _db;
}
