import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrate';

describe('migrations', () => {
  it('creates all tables without error', () => {
    const db = new Database(':memory:');
    expect(() => runMigrations(db)).not.toThrow();
  });

  it('is idempotent — safe to run twice', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });

  it('creates seasons table', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seasons'").get();
    expect(row).toBeTruthy();
  });

  it('creates actions table', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='actions'").get();
    expect(row).toBeTruthy();
  });
});
