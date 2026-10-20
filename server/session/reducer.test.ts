import { describe, expect, it } from 'vitest'
import { NOTE_COLOR_COUNT, VOTES_PER_PERSON, type ClientCommand, type Phase } from '../../shared/protocol'
import { CommandRejected } from './errors'
import { applyCommand, createSession, singletonGroups } from './reducer'
import type { CommandContext, GroupDraft, SessionState } from './state'
import { buildSession } from './test-support'
import { BURST_GRACE_MS } from './timer'

const ada = { id: 'p1', resumeToken: 't1', name: 'Ada', done: false, colorIndex: 0 }

function contextWithIds(...ids: string[]): CommandContext {
  return { now: 1_000, newId: () => ids.shift() ?? 'unexpected-id', random: () => 0 }
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
      groupingStatus: 'idle',
      groups: {},
      votes: {},
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
  const doneAda = { ...ada, done: true }

  it('adds a participant with a new id, a new resume token and a trimmed name', () => {
    const result = join(buildSession(), { name: '  Ada  ' })

    expect(result.joined).toEqual({ participantId: 'p-new', resumeToken: 't-new' })
    expect(result.state.participants).toEqual({
      'p-new': { id: 'p-new', resumeToken: 't-new', name: 'Ada', done: false, colorIndex: 0 },
    })
  })

  it('gives a new participant a note color nobody else has', () => {
    const state = buildSession({ participants: { p1: ada } })

    expect(join(state, { name: 'Grace' }).state.participants['p-new'].colorIndex).toBe(1)
  })

  it('picks the note color with the random source', () => {
    const ctx = { ...contextWithIds('p-new', 't-new'), random: () => 0.999 }

    expect(join(buildSession(), { name: 'Grace' }, ctx).state.participants['p-new'].colorIndex).toBe(NOTE_COLOR_COUNT - 1)
  })

  it('keeps the note color when a participant rejoins', () => {
    const state = buildSession({ participants: { p1: { ...ada, colorIndex: 5 } } })

    expect(join(state, { name: 'Ada', resumeToken: 't1' }).state.participants.p1.colorIndex).toBe(5)
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
    const state = buildSession({ participants: { p1: doneAda } })

    const result = join(state, { name: 'Grace', resumeToken: 't1' })

    expect(result.joined).toEqual({ participantId: 'p1', resumeToken: 't1' })
    expect(result.state.participants).toEqual({ p1: { ...doneAda, name: 'Grace' } })
  })

  it('treats an unknown resume token as a new join', () => {
    const result = join(buildSession(), { name: 'Ada', resumeToken: 'stale' })

    expect(result.joined?.participantId).toBe('p-new')
    expect(Object.keys(result.state.participants)).toEqual(['p-new'])
  })

  it('renames the participant a socket already joined as instead of adding another', () => {
    const state = buildSession({ participants: { p1: doneAda } })

    const result = applyCommand(state, {
      actorId: 'p1',
      command: { type: 'join', name: 'Grace' },
      ctx: contextWithIds('p-new', 't-new'),
    })

    expect(result.joined).toEqual({ participantId: 'p1', resumeToken: 't1' })
    expect(result.state.participants).toEqual({ p1: { ...doneAda, name: 'Grace' } })
  })

  it("never lets another participant's id claim their identity", () => {
    const state = buildSession({ participants: { p1: doneAda } })

    const result = join(state, { name: 'Mallory', resumeToken: 'p1' })

    expect(result.joined?.participantId).toBe('p-new')
    expect(result.state.participants.p1).toEqual(doneAda)
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
    expect(advance(buildSession({ phase: from, groupingStatus: 'ready' }), from).state.phase).toBe(to)
  })

  it('starts grouping with no groups when entering consolidate', () => {
    const state = buildSession({ phase: 'burst', groups: { g1: { id: 'g1', label: 'Old', version: 2, questionIds: [] } } })

    const result = advance(state, 'burst')

    expect(result.state.groupingStatus).toBe('pending')
    expect(result.state.groups).toEqual({})
  })

  it('rejects leaving consolidate while grouping is in progress', () => {
    const state = buildSession({ phase: 'consolidate', groupingStatus: 'pending' })

    expect(() => advance(state, 'consolidate')).toThrow(new CommandRejected('Grouping in progress'))
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

describe('applyCommand submitQuestion', () => {
  const endsAt = 10_000

  function inBurst(overrides: Partial<SessionState> = {}): SessionState {
    return buildSession({ phase: 'burst', endsAt, participants: { p1: ada }, ...overrides })
  }

  function submit(state: SessionState, { text, actorId = 'p1', now = 5_000 }: { text: string; actorId?: string; now?: number }) {
    const ctx = { now, newId: () => 'q-new', random: () => 0 }
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

describe('applyCommand groupingCompleted', () => {
  const drafts: GroupDraft[] = [
    { label: 'Why now?', questionIds: ['q1', 'q2'] },
    { label: 'Who pays?', questionIds: ['q3'] },
  ]

  function completeGrouping(state: SessionState) {
    const command = { type: 'groupingCompleted' as const, groups: drafts }
    return applyCommand(state, { actorId: null, command, ctx: contextWithIds('g1', 'g2') })
  }

  it('creates version 0 groups with new ids and marks grouping ready', () => {
    const result = completeGrouping(buildSession({ phase: 'consolidate', groupingStatus: 'pending' }))

    expect(result.state.groupingStatus).toBe('ready')
    expect(result.state.groups).toEqual({
      g1: { id: 'g1', label: 'Why now?', version: 0, questionIds: ['q1', 'q2'] },
      g2: { id: 'g2', label: 'Who pays?', version: 0, questionIds: ['q3'] },
    })
  })

  it.each([
    ['burst', 'pending'],
    ['consolidate', 'ready'],
    ['consolidate', 'idle'],
  ] as const)('is ignored during %s with grouping %s', (phase, groupingStatus) => {
    const state = buildSession({ phase, groupingStatus })

    expect(completeGrouping(state).state).toBe(state)
  })
})

describe('consolidation commands', () => {
  const questions = {
    q1: { id: 'q1', authorId: 'p1', text: 'Why now?' },
    q2: { id: 'q2', authorId: 'p1', text: 'Why today?' },
    q3: { id: 'q3', authorId: 'p1', text: 'Who pays?' },
  }
  const whyGroup = { id: 'g1', label: 'Timing', version: 1, questionIds: ['q1', 'q2'] }
  const whoGroup = { id: 'g2', label: 'Who pays?', version: 0, questionIds: ['q3'] }

  function consolidating(overrides: Partial<SessionState> = {}): SessionState {
    return buildSession({
      phase: 'consolidate',
      groupingStatus: 'ready',
      participants: { p1: ada },
      questions,
      groups: { g1: whyGroup, g2: whoGroup },
      ...overrides,
    })
  }

  type ConsolidationCommand = Extract<ClientCommand, { type: 'merge' | 'split' | 'reword' }>

  function apply(state: SessionState, command: ConsolidationCommand, actorId = 'p1') {
    return applyCommand(state, { actorId, command, ctx: contextWithIds('g-new') })
  }

  const merge: ConsolidationCommand = { type: 'merge', sourceGroupId: 'g2', targetGroupId: 'g1' }
  const split: ConsolidationCommand = { type: 'split', groupId: 'g1', questionId: 'q2' }
  const reword: ConsolidationCommand = { type: 'reword', groupId: 'g1', label: 'When?', baseVersion: 1 }

  describe.each([merge, split, reword])('$type', (command) => {
    it('rejects outside consolidate', () => {
      expect(() => apply(consolidating({ phase: 'vote' }), command)).toThrow(CommandRejected)
    })

    it('rejects while grouping is pending', () => {
      expect(() => apply(consolidating({ groupingStatus: 'pending' }), command)).toThrow(
        new CommandRejected('Grouping in progress'),
      )
    })

    it('rejects someone who is not a participant', () => {
      expect(() => apply(consolidating(), command, 'stranger')).toThrow(new CommandRejected('Join the session first'))
    })

    it('does not mutate the input state', () => {
      const state = consolidating()

      apply(state, command)

      expect(state).toEqual(consolidating())
    })
  })

  describe('merge', () => {
    it("appends the source's questions to the target, deletes the source and bumps the target's version", () => {
      const result = apply(consolidating(), merge)

      expect(result.state.groups).toEqual({ g1: { ...whyGroup, version: 2, questionIds: ['q1', 'q2', 'q3'] } })
    })

    it.each([
      { type: 'merge', sourceGroupId: 'missing', targetGroupId: 'g1' },
      { type: 'merge', sourceGroupId: 'g2', targetGroupId: 'missing' },
      { type: 'merge', sourceGroupId: 'constructor', targetGroupId: 'g1' },
      { type: 'merge', sourceGroupId: 'g2', targetGroupId: '__proto__' },
    ] as const)('rejects a missing group in %j', (command) => {
      expect(() => apply(consolidating(), command)).toThrow(new CommandRejected('Group not found'))
    })

    it('rejects merging a group into itself', () => {
      const command = { type: 'merge', sourceGroupId: 'g1', targetGroupId: 'g1' } as const

      expect(() => apply(consolidating(), command)).toThrow(new CommandRejected("Can't merge a group into itself"))
    })
  })

  describe('split', () => {
    it("moves the question into a new version 0 group labeled with its text and bumps the old group's version", () => {
      const result = apply(consolidating(), split)

      expect(result.state.groups).toEqual({
        g1: { ...whyGroup, version: 2, questionIds: ['q1'] },
        g2: whoGroup,
        'g-new': { id: 'g-new', label: 'Why today?', version: 0, questionIds: ['q2'] },
      })
    })

    it.each(['missing', 'constructor', '__proto__'])('rejects the missing group %s', (groupId) => {
      expect(() => apply(consolidating(), { ...split, groupId })).toThrow(new CommandRejected('Group not found'))
    })

    it('rejects a question that is not in the group', () => {
      expect(() => apply(consolidating(), { ...split, questionId: 'q3' })).toThrow(
        new CommandRejected('Question not in group'),
      )
    })

    it('rejects splitting the only question out of a group', () => {
      const command = { type: 'split', groupId: 'g2', questionId: 'q3' } as const

      expect(() => apply(consolidating(), command)).toThrow(new CommandRejected('Group has only one question'))
    })
  })

  describe('reword', () => {
    it('sets the trimmed label and bumps the version', () => {
      const result = apply(consolidating(), { ...reword, label: '  When?  ' })

      expect(result.state.groups.g1).toEqual({ ...whyGroup, label: 'When?', version: 2 })
    })

    it('accepts a 280 character label', () => {
      const label = 'x'.repeat(280)

      expect(apply(consolidating(), { ...reword, label }).state.groups.g1.label).toBe(label)
    })

    it.each(['   ', 'x'.repeat(281)])('rejects the label %j', (label) => {
      expect(() => apply(consolidating(), { ...reword, label })).toThrow(new CommandRejected('Label must be 1–280 characters'))
    })

    it.each(['missing', 'constructor', '__proto__'])('rejects the missing group %s', (groupId) => {
      expect(() => apply(consolidating(), { ...reword, groupId })).toThrow(new CommandRejected('Group not found'))
    })

    it('rejects a stale baseVersion', () => {
      expect(() => apply(consolidating(), { ...reword, baseVersion: 0 })).toThrow(
        new CommandRejected('Group changed, refresh'),
      )
    })
  })
})

describe('vote commands', () => {
  const bob = { id: 'p2', resumeToken: 't2', name: 'Bob', done: false, colorIndex: 1 }
  const groups = {
    g1: { id: 'g1', label: 'Timing', version: 0, questionIds: ['q1'] },
    g2: { id: 'g2', label: 'Who pays?', version: 0, questionIds: ['q2'] },
  }

  function voting(overrides: Partial<SessionState> = {}): SessionState {
    return buildSession({ phase: 'vote', participants: { p1: ada, p2: bob }, groups, ...overrides })
  }

  type VoteCommand = Extract<ClientCommand, { type: 'castVote' | 'removeVote' }>

  function apply(state: SessionState, command: VoteCommand, actorId = 'p1') {
    return applyCommand(state, { actorId, command, ctx: contextWithIds() })
  }

  const castVote: VoteCommand = { type: 'castVote', groupId: 'g1' }
  const removeVote: VoteCommand = { type: 'removeVote', groupId: 'g1' }

  describe.each([castVote, removeVote])('$type', (command) => {
    const withOneVote = { p1: { g1: 1 } }

    it.each(['consolidate', 'results'] as const)('rejects during %s', (phase) => {
      expect(() => apply(voting({ phase, votes: withOneVote }), command)).toThrow(
        new CommandRejected('Voting is not open'),
      )
    })

    it('rejects someone who is not a participant', () => {
      expect(() => apply(voting({ votes: withOneVote }), command, 'stranger')).toThrow(
        new CommandRejected('Join the session first'),
      )
    })

    it.each(['missing', 'constructor', '__proto__'])('rejects the unknown group %s', (groupId) => {
      expect(() => apply(voting({ votes: withOneVote }), { ...command, groupId })).toThrow(
        new CommandRejected('Group not found'),
      )
    })

    it('does not mutate the input state', () => {
      const state = voting({ votes: withOneVote })

      apply(state, command)

      expect(state).toEqual(voting({ votes: withOneVote }))
    })
  })

  describe('castVote', () => {
    it("adds a vote to the actor's count for the group", () => {
      expect(apply(voting(), castVote).state.votes).toEqual({ p1: { g1: 1 } })
    })

    it('stacks votes on the same group', () => {
      const state = voting({ votes: { p1: { g1: 1 }, p2: { g1: 2 } } })

      expect(apply(state, castVote).state.votes).toEqual({ p1: { g1: 2 }, p2: { g1: 2 } })
    })

    it('rejects a vote beyond VOTES_PER_PERSON', () => {
      const state = voting({ votes: { p1: { g1: 2, g2: 1 } } })

      expect(VOTES_PER_PERSON).toBe(3)
      expect(() => apply(state, castVote)).toThrow(new CommandRejected('No votes left'))
    })

    it('frees a vote once one is removed', () => {
      const state = apply(voting({ votes: { p1: { g1: 1, g2: 2 } } }), removeVote).state

      expect(apply(state, castVote).state.votes.p1).toEqual({ g1: 1, g2: 2 })
    })
  })

  describe('removeVote', () => {
    it("takes a vote off the actor's count for the group", () => {
      const state = voting({ votes: { p1: { g1: 2 } } })

      expect(apply(state, removeVote).state.votes).toEqual({ p1: { g1: 1 } })
    })

    it.each<SessionState['votes']>([{}, { p1: { g1: 0 } }, { p1: { g2: 1 } }])('rejects removing from a group with no votes in %j', (votes) => {
      expect(() => apply(voting({ votes }), removeVote)).toThrow(new CommandRejected('No vote to remove'))
    })
  })
})

describe('singletonGroups', () => {
  it('makes one group per question, labeled with its text, in question order', () => {
    const questions = {
      q1: { id: 'q1', authorId: 'p1', text: 'Why now?' },
      q2: { id: 'q2', authorId: 'p2', text: 'Who pays?' },
    }

    expect(singletonGroups(Object.values(questions))).toEqual([
      { label: 'Why now?', questionIds: ['q1'] },
      { label: 'Who pays?', questionIds: ['q2'] },
    ])
  })
})
