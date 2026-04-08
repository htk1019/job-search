import type Database from 'better-sqlite3';

export function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company       TEXT NOT NULL,
      position      TEXT NOT NULL,
      url           TEXT,
      status        TEXT NOT NULL DEFAULT 'saved'
                    CHECK(status IN ('saved','applied','interviewing','offer','rejected')),
      notes         TEXT,
      date_applied  TEXT,
      follow_up     TEXT,
      salary_min    INTEGER,
      salary_max    INTEGER,
      location      TEXT,
      remote        INTEGER DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      filename      TEXT NOT NULL,
      content       TEXT NOT NULL,
      file_path     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS match_results (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id       INTEGER NOT NULL REFERENCES resumes(id),
      job_id          INTEGER REFERENCES jobs(id),
      job_description TEXT NOT NULL,
      match_score     REAL,
      analysis        TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_outputs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      type          TEXT NOT NULL CHECK(type IN ('cover_letter','interview_prep','job_analysis','skill_gap','resume_rewrite')),
      job_id        INTEGER REFERENCES jobs(id),
      input_data    TEXT NOT NULL,
      output        TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
    CREATE INDEX IF NOT EXISTS idx_jobs_date_applied ON jobs(date_applied);
  `);
}
