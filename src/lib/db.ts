import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null

export function getDb(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return _client
}

let _schemaReady = false

export async function ensureSchema() {
  if (_schemaReady) return
  const db = getDb()

  // Migration: rename matches → games (runs once, silently fails if already done)
  try {
    await db.execute('ALTER TABLE matches RENAME TO games')
  } catch {
    // Already renamed or table doesn't exist — OK
  }

  // Migration: add photo column to manual_players
  try {
    await db.execute('ALTER TABLE manual_players ADD COLUMN photo TEXT')
  } catch {
    // Column already exists — OK
  }

  // Migration: add birthdate and shoots to manual_players
  try { await db.execute('ALTER TABLE manual_players ADD COLUMN birthdate TEXT') } catch { }
  try { await db.execute('ALTER TABLE manual_players ADD COLUMN shoots TEXT') } catch { }
  try { await db.execute('ALTER TABLE games ADD COLUMN time TEXT') } catch { }
  try { await db.execute('ALTER TABLE games ADD COLUMN home_score INTEGER') } catch { }
  try { await db.execute('ALTER TABLE games ADD COLUMN away_score INTEGER') } catch { }
  try { await db.execute('ALTER TABLE games ADD COLUMN overtime TEXT') } catch { }
  try { await db.execute('ALTER TABLE games ADD COLUMN shootout TEXT') } catch { }
  try { await db.execute('ALTER TABLE games ADD COLUMN final TEXT') } catch { }

  // Migration: add status column to player_settings
  try {
    await db.execute('ALTER TABLE player_settings ADD COLUMN status TEXT')
  } catch {
    // Column already exists — OK
  }

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      opponent_name TEXT NOT NULL,
      opponent_team_id TEXT,
      home_away TEXT NOT NULL DEFAULT 'home',
      type TEXT NOT NULL DEFAULT 'api',
      api_game_id TEXT UNIQUE,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS lineups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'opening',
      slots_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(match_id, type)
    );
    CREATE TABLE IF NOT EXISTS manual_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      jersey_number TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS player_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      notes TEXT,
      match_id INTEGER REFERENCES games(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS player_settings (
      player_id TEXT PRIMARY KEY,
      position_override TEXT
    );
    CREATE TABLE IF NOT EXISTS player_bio (
      player_id TEXT PRIMARY KEY,
      birthdate TEXT
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS player_cutouts (
      player_id TEXT PRIMARY KEY,
      photo TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  _schemaReady = true
}
