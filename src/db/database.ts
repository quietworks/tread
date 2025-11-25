import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const DATA_DIR = join(homedir(), ".local", "share", "papertrail");
const DB_PATH = join(DATA_DIR, "papertrail.db");

let db: Database | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    feed_url TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT,
    content TEXT,
    published_at INTEGER,
    read_at INTEGER,
    fetched_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_articles_feed_url ON articles(feed_url);
  CREATE INDEX IF NOT EXISTS idx_articles_read_at ON articles(read_at);
  CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
`;

export function getDatabase(): Database {
  if (db) {
    return db;
  }

  if (!existsSync(dirname(DB_PATH))) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
  }

  db = new Database(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDatabasePath(): string {
  return DB_PATH;
}
