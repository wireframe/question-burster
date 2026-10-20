import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { ClientCommand, Phase, ServerMessage } from '../shared/protocol'
import type { GroupingInput } from './ai/group-questions'
import { createSessionRepository, openDatabase, type SessionRepository } from './db'
import { RoomHub, type RoomSocket } from './rooms'
import { systemClock } from './session/clock'
import type { GroupDraft, SessionState } from './session/state'
import { buildSession } from './session/test-support'
import { BURST_GRACE_MS } from './session/timer'

class FakeSocket implements RoomSocket {
  readonly sent: ServerMessage[] = []
  private readonly listeners = new Map<string, (data: unknown) => void>()

  send(data: string): void {
    this.sent.push(JSON.parse(data) as ServerMessage)
  }

  on(event: string, listener: (data: unknown) => void): void {
    this.listeners.set(event, listener)
  }

  receive(command: ClientCommand): void {
    this.listeners.get('message')!(JSON.stringify(command))
  }

  lastPhase(): Phase | undefined {
    return this.sent.findLast((message) => message.type === 'state')?.view.phase
  }

  stateCount(): number {
    return this.sent.filter((message) => message.type === 'state').length
  }
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

let repository: SessionRepository
let group: Mock<(input: GroupingInput) => Promise<GroupDraft[]>>

beforeEach(() => {
  vi.useFakeTimers()
  repository = createSessionRepository(openDatabase(':memory:'))
  group = vi.fn(() => new Promise<GroupDraft[]>(() => {}))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function connectSockets(count: number): FakeSocket[] {
  const room = new RoomHub({ repository, clock: systemClock, group }).find('s1')!
  return Array.from({ length: count }, () => {
    const socket = new FakeSocket()
    room.connect(socket)
    return socket
  })
}

describe('burst auto-advance', () => {
  beforeEach(() => repository.save(buildSession({ id: 's1', burstSeconds: 60 })))

  it('moves the room to consolidate when the burst ends and broadcasts it', () => {
    const sockets = connectSockets(2)
    sockets[0].receive({ type: 'advance', fromPhase: 'lobby' })

    vi.advanceTimersByTime(60_000 + BURST_GRACE_MS)

    expect(repository.load('s1')?.phase).toBe('consolidate')
    expect(sockets.map((socket) => socket.lastPhase())).toEqual(['consolidate', 'consolidate'])
  })

  it('does not advance before the grace window closes', () => {
    const [socket] = connectSockets(1)
    socket.receive({ type: 'advance', fromPhase: 'lobby' })

    vi.advanceTimersByTime(60_000 + BURST_GRACE_MS - 1)

    expect(socket.lastPhase()).toBe('burst')
  })

  it('accepts a question that arrives within the grace window after the burst ends', () => {
    const [socket] = connectSockets(1)
    socket.receive({ type: 'join', name: 'Ada' })
    socket.receive({ type: 'advance', fromPhase: 'lobby' })
    vi.advanceTimersByTime(60_000 + BURST_GRACE_MS - 1)

    socket.receive({ type: 'submitQuestion', text: 'Why?' })

    expect(Object.values(repository.load('s1')!.questions).map((question) => question.text)).toEqual(['Why?'])
  })

  it('clears the pending timeout when the burst is advanced manually', () => {
    const [socket] = connectSockets(1)
    socket.receive({ type: 'advance', fromPhase: 'lobby' })

    socket.receive({ type: 'advance', fromPhase: 'burst' })

    expect(socket.lastPhase()).toBe('consolidate')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('loading a room mid-burst', () => {
  it('advances a burst that ended while the server was down', () => {
    repository.save(buildSession({ id: 's1', phase: 'burst', endsAt: Date.now() - BURST_GRACE_MS - 1000 }))
    const [socket] = connectSockets(1)

    vi.advanceTimersByTime(0)

    expect(socket.lastPhase()).toBe('consolidate')
  })
})

describe('grouping', () => {
  const questions = {
    q1: { id: 'q1', authorId: 'p1', text: 'Who owns onboarding?' },
    q2: { id: 'q2', authorId: 'p2', text: 'Why does setup take a week?' },
  }
  let grouping: Deferred<GroupDraft[]>

  beforeEach(() => {
    grouping = deferred()
    group.mockReturnValue(grouping.promise)
  })

  function saveSession(overrides: Partial<SessionState>): void {
    repository.save(buildSession({ id: 's1', challenge: 'Onboarding is slow', questions, ...overrides }))
  }

  function connectInBurst(): FakeSocket {
    saveSession({ phase: 'burst', endsAt: Date.now() + 60_000 })
    const [socket] = connectSockets(1)
    socket.receive({ type: 'advance', fromPhase: 'burst' })
    return socket
  }

  function groupLabels(): string[] {
    return Object.values(repository.load('s1')!.groups).map((savedGroup) => savedGroup.label)
  }

  it('asks for groups once with the challenge and the questions without their authors', () => {
    connectInBurst()

    expect(group).toHaveBeenCalledTimes(1)
    expect(group).toHaveBeenCalledWith({
      challenge: 'Onboarding is slow',
      questions: [
        { id: 'q1', text: 'Who owns onboarding?' },
        { id: 'q2', text: 'Why does setup take a week?' },
      ],
    })
  })

  it('saves and broadcasts the groups once grouping completes', async () => {
    const socket = connectInBurst()
    const statesBefore = socket.stateCount()
    expect(repository.load('s1')?.groupingStatus).toBe('pending')

    grouping.resolve([{ label: 'Why is onboarding slow?', questionIds: ['q1', 'q2'] }])
    await vi.advanceTimersByTimeAsync(0)

    expect(repository.load('s1')?.groupingStatus).toBe('ready')
    expect(groupLabels()).toEqual(['Why is onboarding slow?'])
    expect(socket.stateCount()).toBe(statesBefore + 1)
  })

  it('falls back to one group per question and logs the failure without question text', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {})
    connectInBurst()

    grouping.reject(new Error('LLM unavailable'))
    await vi.advanceTimersByTimeAsync(0)

    expect(repository.load('s1')?.groupingStatus).toBe('ready')
    expect(groupLabels()).toEqual(['Who owns onboarding?', 'Why does setup take a week?'])
    const logged = logError.mock.calls.flat().join(' ')
    expect(logged).toContain('LLM unavailable')
    expect(logged).not.toContain('onboarding')
    expect(logged).not.toContain('setup')
  })

  it('restarts grouping for a room loaded while grouping was pending', async () => {
    saveSession({ phase: 'consolidate', groupingStatus: 'pending' })
    connectSockets(1)

    grouping.resolve([{ label: 'Why is onboarding slow?', questionIds: ['q1', 'q2'] }])
    await vi.advanceTimersByTimeAsync(0)

    expect(group).toHaveBeenCalledTimes(1)
    expect(repository.load('s1')?.groupingStatus).toBe('ready')
  })

  it('does not regroup a room loaded with its groups ready', () => {
    saveSession({ phase: 'consolidate', groupingStatus: 'ready' })

    connectSockets(1)

    expect(group).not.toHaveBeenCalled()
  })
})
