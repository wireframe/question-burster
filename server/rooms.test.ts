import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClientCommand, Phase, ServerMessage } from '../shared/protocol'
import { createSessionRepository, openDatabase, type SessionRepository } from './db'
import { RoomHub, type RoomSocket } from './rooms'
import type { Clock } from './session/clock'
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
}

const clock: Clock = { now: () => Date.now(), newId: () => crypto.randomUUID() }
let repository: SessionRepository

beforeEach(() => {
  vi.useFakeTimers()
  repository = createSessionRepository(openDatabase(':memory:'))
})

afterEach(() => {
  vi.useRealTimers()
})

function connectSockets(count: number): FakeSocket[] {
  const room = new RoomHub({ repository, clock }).find('s1')!
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
