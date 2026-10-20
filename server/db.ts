/** Persists session state as JSON in SQLite, one row per session, behind SessionRepository. */
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { SessionState } from './session/state'

export interface SessionRepository {
  load(id: string): SessionState | undefined
  save(state: SessionState): void
}

const IN_MEMORY = ':memory:'

const CREATE_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`

const UPSERT_SESSION = `
  INSERT INTO sessions (id, state_json, updated_at) VALUES (@id, @stateJson, @updatedAt)
  ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`

const SELECT_SESSION = 'SELECT state_json FROM sessions WHERE id = ?'

export function openDatabase(path: string): Database.Database {
  if (path !== IN_MEMORY) mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.exec(CREATE_SESSIONS_TABLE)
  return db
}

export function createSessionRepository(db: Database.Database): SessionRepository {
  const upsert = db.prepare(UPSERT_SESSION)
  const select = db.prepare<[string], { state_json: string }>(SELECT_SESSION)
  return {
    load: (id) => parseState(select.get(id)),
    save: (state) => {
      upsert.run({ id: state.id, stateJson: JSON.stringify(state), updatedAt: Date.now() })
    },
  }
}

function parseState(row: { state_json: string } | undefined): SessionState | undefined {
  return row ? (JSON.parse(row.state_json) as SessionState) : undefined
}
