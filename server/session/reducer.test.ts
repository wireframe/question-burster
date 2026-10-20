import { describe, expect, it } from 'vitest'
import type { Phase } from '../../shared/protocol'
import { CommandRejected } from './errors'
import { applyCommand, createSession } from './reducer'
import type { CommandContext, SessionState } from './state'
import { buildSession } from './test-support'
import { BURST_GRACE_MS } from './timer'

function contextWithIds(...ids: string[]): CommandContext {
  return { now: 1_000, newId: () => ids.shift() ?? 'unexpected-id' }
}

function join(state: SessionState, command: { name: string; resumeToken?: string }, ctx = contextWithIds('p-new', 't-new')) {
  return applyCommand(state, { actorId: null, command: { type: 'join', ...command }, ctx })
}

describe('createSession', () => {
  it('starts in the lobby with no participants', () => {
    const state = createSession({ challenge: 'How might we?', burstSeconds: 60 }, contextWithIds('s1'))

    expect(state).toEqual({
      id: 's1',
      challenge: 'How might we?',
      burstSeconds: 60,
      phase: 'lobby',
      endsAt: null,
      participants: {},
      questions: {},
    })
  })

  it('trims the challenge', () => {
    const state = createSession({ challenge: '  How might we?  ' }, contextWithIds('s1'))

    expect(state.challenge).toBe('How might we?')
  })

  it('rejects an empty challenge', () => {
    expect(() => createSession({ challenge: '   ' }, contextWithIds('s1'))).toThrow(CommandRejected)
  })

  it('defaults burstSeconds to 240', () => {
    expect(createSession({ challenge: 'Why?' }, contextWithIds('s1')).burstSeconds).toBe(240)
  })

  it.each([30, 1800])('accepts burstSeconds at the boundary %i', (burstSeconds) => {
    expect(createSession({ challenge: 'Why?', burstSeconds }, contextWithIds('s1')).burstSeconds).toBe(burstSeconds)
  })

  it.each([29, 1801])('rejects burstSeconds of %i', (burstSeconds) => {
    expect(() => createSession({ challenge: 'Why?', burstSeconds }, contextWithIds('s1'))).toThrow(CommandRejected)
  })
})

describe('CommandRejected', () => {
  it('carries the reason as its message and names itself', () => {
    const error = new CommandRejected('Nope')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Nope')
    expect(error.name).toBe('CommandRejected')
  })
})

describe('applyCommand join', () => {
  const ada = { id: 'p1', resumeToken: 't1', name: 'Ada', done: true }

  it('adds a participant with a new id, a new resume token and a trimmed name', () => {
    const result = join(buildSession(), { name: '  Ada  ' })

    expect(result.joined).toEqual({ participantId: 'p-new', resumeToken: 't-new' })
    expect(result.state.participants).toEqual({
      'p-new': { id: 'p-new', resumeToken: 't-new', name: 'Ada', done: false },
    })
  })

  it('does not mutate the input state', () => {
    const state = buildSession()

    join(state, { name: 'Ada' })

    expect(state.participants).toEqual({})
  })

  it.each(['   ', 'x'.repeat(41)])('rejects the name %j', (name) => {
    expect(() => join(buildSession(), { name })).toThrow(CommandRejected)
  })

  it('accepts a 40 character name', () => {
    const name = 'x'.repeat(40)

    expect(join(buildSession(), { name }).state.participants['p-new'].name).toBe(name)
  })

  it('rejoins and renames the participant whose resume token matches', () => {
    const state = buildSession({ participants: { p1: ada } })

    const result = join(state, { name: 'Grace', resumeToken: 't1' })

    expect(result.joined).toEqual({ participantId: 'p1', resumeToken: 't1' })
    expect(result.state.participants).toEqual({ p1: { ...ada, name: 'Grace' } })
  })

  it('treats an unknown resume token as a new join', () => {
    const result = join(buildSession(), { name: 'Ada', resumeToken: 'stale' })

    expect(result.joined?.participantId).toBe('p-new')
    expect(Object.keys(result.state.participants)).toEqual(['p-new'])
  })

  it("never lets another participant's id claim their identity", () => {
    const state = buildSession({ participants: { p1: ada } })

    const result = join(state, { name: 'Mallory', resumeToken: 'p1' })

    expect(result.joined?.participantId).toBe('p-new')
    expect(result.state.participants.p1).toEqual(ada)
  })
})

describe('applyCommand advance', () => {
  function advance(state: SessionState, fromPhase: Phase) {
    return applyCommand(state, { actorId: 'p1', command: { type: 'advance', fromPhase }, ctx: contextWithIds() })
  }

  it.each([
    ['burst', 'consolidate'],
    ['consolidate', 'vote'],
    ['vote', 'results'],
  ] as const)('moves from %s to %s', (from, to) => {
    expect(advance(buildSession({ phase: from }), from).state.phase).toBe(to)
  })

  it('returns the same state for a stale fromPhase', () => {
    const state = buildSession({ phase: 'consolidate' })

    expect(advance(state, 'burst').state).toBe(state)
  })

  it('is a no-op from results', () => {
    const state = buildSession({ phase: 'results' })

    expect(advance(state, 'results').state).toBe(state)
  })

  it('sets endsAt from the burst length when entering burst', () => {
    const result = advance(buildSession(), 'lobby')

    expect(result.state.phase).toBe('burst')
    expect(result.state.endsAt).toBe(1_000 + 240 * 1000)
  })

  it('does not mutate the input state', () => {
    const state = buildSession()

    advance(state, 'lobby')

    expect(state).toEqual(buildSession())
  })
})

const ada = { id: 'p1', resumeToken: 't1', name: 'Ada', done: false }

describe('applyCommand submitQuestion', () => {
  const endsAt = 10_000

  function inBurst(overrides: Partial<SessionState> = {}): SessionState {
    return buildSession({ phase: 'burst', endsAt, participants: { p1: ada }, ...overrides })
  }

  function submit(state: SessionState, { text, actorId = 'p1', now = 5_000 }: { text: string; actorId?: string; now?: number }) {
    const ctx = { now, newId: () => 'q-new' }
    return applyCommand(state, { actorId, command: { type: 'submitQuestion', text }, ctx })
  }

  it('stores the trimmed question with a new id and the actor as author', () => {
    const result = submit(inBurst(), { text: '  Why now?  ' })

    expect(result.state.questions).toEqual({ 'q-new': { id: 'q-new', authorId: 'p1', text: 'Why now?' } })
  })

  it('does not mutate the input state', () => {
    const state = inBurst()

    submit(state, { text: 'Why now?' })

    expect(state.questions).toEqual({})
  })

  it('accepts a 280 character question', () => {
    const text = 'x'.repeat(280)

    expect(submit(inBurst(), { text }).state.questions['q-new'].text).toBe(text)
  })

  it.each(['   ', 'x'.repeat(281)])('rejects the text %j', (text) => {
    expect(() => submit(inBurst(), { text })).toThrow(CommandRejected)
  })

  it.each(['lobby', 'consolidate'] as const)('rejects a question during %s', (phase) => {
    expect(() => submit(inBurst({ phase }), { text: 'Why?' })).toThrow(CommandRejected)
  })

  it('rejects a question from someone who is not a participant', () => {
    expect(() => submit(inBurst(), { text: 'Why?', actorId: 'stranger' })).toThrow(CommandRejected)
  })

  it('accepts a question at the end of the grace window', () => {
    expect(submit(inBurst(), { text: 'Why?', now: endsAt + BURST_GRACE_MS }).state.questions['q-new']).toBeDefined()
  })

  it('rejects a question after the grace window', () => {
    expect(() => submit(inBurst(), { text: 'Why?', now: endsAt + BURST_GRACE_MS + 1 })).toThrow(CommandRejected)
  })
})

describe('applyCommand markDone', () => {

  function markDone(state: SessionState, actorId = 'p1') {
    return applyCommand(state, { actorId, command: { type: 'markDone' }, ctx: contextWithIds() })
  }

  it('returns the same state when the actor is already done, so nothing is re-saved or re-broadcast', () => {
    const state = buildSession({ phase: 'burst', participants: { p1: { ...ada, done: true } } })

    expect(markDone(state).state).toBe(state)
  })

  it('marks the actor done during burst', () => {
    const result = markDone(buildSession({ phase: 'burst', participants: { p1: ada } }))

    expect(result.state.participants.p1).toEqual({ ...ada, done: true })
  })

  it('does not mutate the input state', () => {
    const state = buildSession({ phase: 'burst', participants: { p1: ada } })

    markDone(state)

    expect(state.participants.p1.done).toBe(false)
  })

  it('rejects outside burst', () => {
    expect(() => markDone(buildSession({ phase: 'lobby', participants: { p1: ada } }))).toThrow(CommandRejected)
  })

  it('rejects someone who is not a participant', () => {
    expect(() => markDone(buildSession({ phase: 'burst', participants: { p1: ada } }), 'stranger')).toThrow(
      CommandRejected,
    )
  })
})
