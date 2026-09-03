import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "bingewatcher.db");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const client = new Database(databasePath);
client.pragma("journal_mode = WAL");
client.pragma("foreign_keys = ON");
client.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    owner_session_id TEXT NOT NULL REFERENCES sessions(id),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    target_size INTEGER NOT NULL CHECK(target_size BETWEEN 1 AND 20),
    constraints TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    share_token TEXT NOT NULL UNIQUE,
    edit_token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS program_items (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL DEFAULT 'movie' CHECK(media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    season_number INTEGER NOT NULL DEFAULT -1,
    position INTEGER NOT NULL,
    movie TEXT NOT NULL,
    locked INTEGER NOT NULL DEFAULT 0,
    watched INTEGER NOT NULL DEFAULT 0,
    reaction TEXT,
    explanation TEXT NOT NULL DEFAULT '',
    added_by TEXT NOT NULL CHECK(added_by IN ('human', 'agent')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(program_id, position)
  );
  CREATE TABLE IF NOT EXISTS vetoes (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL DEFAULT 'movie' CHECK(media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    season_number INTEGER NOT NULL DEFAULT -1,
    title TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(program_id, media_type, tmdb_id, season_number)
  );
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    actor TEXT NOT NULL CHECK(actor IN ('human', 'agent')),
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS watchlist_items (
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    season_number INTEGER NOT NULL DEFAULT -1,
    media TEXT NOT NULL,
    added_at TEXT NOT NULL,
    PRIMARY KEY(session_id, media_type, tmdb_id, season_number)
  );
  CREATE TABLE IF NOT EXISTS watch_progress (
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    season_number INTEGER NOT NULL DEFAULT -1,
    episode_number INTEGER NOT NULL DEFAULT -1,
    watched INTEGER NOT NULL DEFAULT 1,
    reaction TEXT,
    rating INTEGER CHECK(rating IS NULL OR rating BETWEEN 1 AND 10),
    updated_at TEXT NOT NULL,
    PRIMARY KEY(session_id, media_type, tmdb_id, season_number, episode_number)
  );
  CREATE INDEX IF NOT EXISTS activities_program_idx ON activities(program_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS watchlist_session_idx ON watchlist_items(session_id, added_at DESC);
  CREATE INDEX IF NOT EXISTS progress_session_idx ON watch_progress(session_id, updated_at DESC);
`);

const programColumns = client.pragma("table_info(programs)") as { name: string }[];
if (!programColumns.some((column) => column.name === "edit_token")) {
  client.exec("ALTER TABLE programs ADD COLUMN edit_token TEXT");
  const rows = client.prepare("SELECT id FROM programs WHERE edit_token IS NULL").all() as { id: string }[];
  const update = client.prepare("UPDATE programs SET edit_token = ? WHERE id = ?");
  rows.forEach(({ id }) => update.run(crypto.randomUUID().replaceAll("-", ""), id));
  client.exec("CREATE UNIQUE INDEX IF NOT EXISTS programs_edit_token_unique ON programs(edit_token)");
}

const itemColumns = client.pragma("table_info(program_items)") as { name: string }[];
if (!itemColumns.some((column) => column.name === "media_type")) {
  client.pragma("foreign_keys = OFF");
  client.exec(`
    BEGIN;
    ALTER TABLE program_items RENAME TO program_items_legacy;
    CREATE TABLE program_items (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL DEFAULT 'movie' CHECK(media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      season_number INTEGER NOT NULL DEFAULT -1,
      position INTEGER NOT NULL,
      movie TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      watched INTEGER NOT NULL DEFAULT 0,
      reaction TEXT,
      explanation TEXT NOT NULL DEFAULT '',
      added_by TEXT NOT NULL CHECK(added_by IN ('human', 'agent')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(program_id, position)
    );
    INSERT INTO program_items (id, program_id, media_type, tmdb_id, season_number, position, movie, locked, watched, reaction, explanation, added_by, created_at, updated_at)
      SELECT id, program_id, 'movie', tmdb_id, -1, position, movie, locked, watched, reaction, explanation, added_by, created_at, updated_at FROM program_items_legacy;
    DROP TABLE program_items_legacy;
    COMMIT;
  `);
  client.pragma("foreign_keys = ON");
}

const itemSchema = (client.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'program_items'").get() as { sql: string }).sql;
if (itemSchema.includes("UNIQUE(program_id, media_type, tmdb_id, season_number)")) {
  client.pragma("foreign_keys = OFF");
  client.exec(`
    BEGIN;
    ALTER TABLE program_items RENAME TO program_items_unique_legacy;
    CREATE TABLE program_items (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL DEFAULT 'movie' CHECK(media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      season_number INTEGER NOT NULL DEFAULT -1,
      position INTEGER NOT NULL,
      movie TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      watched INTEGER NOT NULL DEFAULT 0,
      reaction TEXT,
      explanation TEXT NOT NULL DEFAULT '',
      added_by TEXT NOT NULL CHECK(added_by IN ('human', 'agent')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(program_id, position)
    );
    INSERT INTO program_items SELECT * FROM program_items_unique_legacy;
    DROP TABLE program_items_unique_legacy;
    COMMIT;
  `);
  client.pragma("foreign_keys = ON");
}

const vetoColumns = client.pragma("table_info(vetoes)") as { name: string }[];
if (!vetoColumns.some((column) => column.name === "media_type")) {
  client.pragma("foreign_keys = OFF");
  client.exec(`
    BEGIN;
    ALTER TABLE vetoes RENAME TO vetoes_legacy;
    CREATE TABLE vetoes (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL DEFAULT 'movie' CHECK(media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      season_number INTEGER NOT NULL DEFAULT -1,
      title TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(program_id, media_type, tmdb_id, season_number)
    );
    INSERT INTO vetoes (id, program_id, media_type, tmdb_id, season_number, title, reason, created_at)
      SELECT id, program_id, 'movie', tmdb_id, -1, title, reason, created_at FROM vetoes_legacy;
    DROP TABLE vetoes_legacy;
    COMMIT;
  `);
  client.pragma("foreign_keys = ON");
}

export const sqlite = client;
