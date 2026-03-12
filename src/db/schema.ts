import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/blocklist.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      device_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      vote INTEGER NOT NULL, -- +1 or -1
      created_at INTEGER NOT NULL,
      UNIQUE(report_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS blocklist (
      number TEXT NOT NULL,
      type TEXT NOT NULL,
      tier TEXT DEFAULT 'default',
      weight REAL DEFAULT 0,
      source_id TEXT,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (number, type)
    );

    CREATE TABLE IF NOT EXISTS federation_instances (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      last_sync_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS personal_blocklist (
      device_id TEXT NOT NULL,
      number TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (device_id, number)
    );

    CREATE INDEX IF NOT EXISTS idx_reports_number ON reports(number);
    CREATE INDEX IF NOT EXISTS idx_votes_report_id ON votes(report_id);
    CREATE INDEX IF NOT EXISTS idx_blocklist_number ON blocklist(number);
    CREATE INDEX IF NOT EXISTS idx_personal_blocklist_device ON personal_blocklist(device_id);
  `);
  // Migration: add tier column if missing
  try {
    db.exec(`ALTER TABLE blocklist ADD COLUMN tier TEXT DEFAULT 'default'`);
  } catch {
    // Column already exists
  }
  // Migration: add description column to reports if missing
  try {
    db.exec(`ALTER TABLE reports ADD COLUMN description TEXT`);
  } catch {
    // Column already exists
  }
  // Migration: add personal_blocklist table if missing
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS personal_blocklist (
        device_id TEXT NOT NULL,
        number TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (device_id, number)
      );
      CREATE INDEX IF NOT EXISTS idx_personal_blocklist_device ON personal_blocklist(device_id);
    `);
  } catch {
    // Table already exists
  }
};

export default db;
