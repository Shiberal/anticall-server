"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_PATH = process.env.DB_PATH || path_1.default.join(__dirname, '../../data/blocklist.db');
// Ensure data directory exists
const dataDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const db = new better_sqlite3_1.default(DB_PATH);
db.pragma('journal_mode = WAL');
const initDb = () => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      type TEXT NOT NULL,
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

    CREATE INDEX IF NOT EXISTS idx_reports_number ON reports(number);
    CREATE INDEX IF NOT EXISTS idx_votes_report_id ON votes(report_id);
    CREATE INDEX IF NOT EXISTS idx_blocklist_number ON blocklist(number);
  `);
};
exports.initDb = initDb;
exports.default = db;
