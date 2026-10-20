import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createSessionRepository, openDatabase } from './db'
import type { SessionState } from './session/state'
import { buildSession } from './session/test-support'

function lobbySession(overrides: Partial<SessionState> = {}): SessionState {
  return buildSession({ participants: { p1: { id: 'p1', resumeToken: 't1', name: 'Ada', done: false, colorIndex: 0 } }, ...overrides })
}

function inMemoryRepository() {
  return createSessionRepository(openDatabase(':memory:'))
}

describe('createSessionRepository', () => {
  it('loads a saved session as an equal state', () => {
    const repository = inMemoryRepository()

    repository.save(lobbySession())

    expect(repository.load('s1')).toEqual(lobbySession())
  })

  it('returns undefined for a session that was never saved', () => {
    expect(inMemoryRepository().load('missing')).toBeUndefined()
  })

  it('overwrites a session when it is saved again', () => {
    const repository = inMemoryRepository()
    const advanced = lobbySession({ phase: 'burst', endsAt: 5_000 })

    repository.save(lobbySession())
    repository.save(advanced)

    expect(repository.load('s1')).toEqual(advanced)
  })
})

describe('openDatabase', () => {
  let tempRoot: string | undefined

  afterEach(() => {
    if (tempRoot) rmSync(tempRoot, { recursive: true, force: true })
  })

  it('creates the parent directory of a nested database path', () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'question-burst-db-'))
    const databasePath = join(tempRoot, 'nested', 'dir', 'test.db')

    openDatabase(databasePath).close()

    expect(existsSync(dirname(databasePath))).toBe(true)
  })
})
