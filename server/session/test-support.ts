import { expect } from 'vitest'
import type { SessionState } from './state'

export function buildSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    id: 's1',
    challenge: 'Why?',
    burstSeconds: 240,
    phase: 'lobby',
    endsAt: null,
    participants: {},
    questions: {},
    groupingStatus: 'idle',
    groups: {},
    votes: {},
    ...overrides,
  }
}

export function expectNoKey(value: unknown, key: string): void {
  const foundAt = findKeyPaths(value, key, '$')
  expect(foundAt, `found "${key}" at ${foundAt.join(', ')}`).toEqual([])
}

function findKeyPaths(value: unknown, key: string, path: string): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => findKeyPaths(item, key, `${path}[${index}]`))
  if (value === null || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([name, child]) => {
    const childPath = `${path}.${name}`
    return [...(name === key ? [childPath] : []), ...findKeyPaths(child, key, childPath)]
  })
}
