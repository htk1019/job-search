import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initSchema } from './db-schema';

const DB_PATH = path.join(process.cwd(), 'data', 'job-search.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}
