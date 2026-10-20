import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import type { ClientCommand, ServerMessage, SessionView } from '../shared/protocol'
import { createServer } from './app'
import { createSessionRepository, openDatabase, type SessionRepository } from './db'
import { systemClock } from './session/clock'

type MessageMatcher = (message: ServerMessage) => boolean

interface TestClient {
  received: ServerMessage[]
  next: (matches: MessageMatcher) => Promise<ServerMessage>
  send: (command: unknown) => void
  sendRaw: (text: string) => void
  sendInvalidUtf8: () => void
  close: () => Promise<number>
  closed: Promise<number>
}

let server: Server
let repository: SessionRepository
let baseUrl: string
let clients: TestClient[]

beforeEach(async () => {
  repository = createSessionRepository(openDatabase(':memory:'))
  server = createServer({ repository, clock: systemClock, group: () => new Promise(() => {}) })
  await new Promise<void>((resolve) => server.listen(0, resolve))
  baseUrl = `127.0.0.1:${(server.address() as AddressInfo).port}`
  clients = []
})

afterEach(async () => {
  await Promise.all(clients.map((client) => client.close()))
  await new Promise((resolve) => server.close(resolve))
})

function postSession(body: object): Promise<Response> {
  return fetch(`http://${baseUrl}/api/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function createSessionId(): Promise<string> {
  const response = await postSession({ challenge: 'Onboarding is slow' })
  return ((await response.json()) as { id: string }).id
}

function recordMessages(socket: WebSocket): Pick<TestClient, 'received' | 'next'> {
  const received: ServerMessage[] = []
  const waiters = new Set<() => void>()
  let cursor = 0
  socket.on('message', (data) => {
    received.push(JSON.parse(String(data)) as ServerMessage)
    waiters.forEach((check) => check())
  })
  const next = (matches: MessageMatcher) =>
    new Promise<ServerMessage>((resolve) => {
      const check = () => {
        const index = received.findIndex((message, position) => position >= cursor && matches(message))
        if (index === -1) return
        cursor = index + 1
        waiters.delete(check)
        resolve(received[index])
      }
      waiters.add(check)
      check()
    })
  return { received, next }
}

function connect(sessionId: string): TestClient {
  const socket = new WebSocket(`ws://${baseUrl}/ws?session=${sessionId}`)
  const closed = new Promise<number>((resolve) => socket.on('close', resolve))
  const client: TestClient = {
    ...recordMessages(socket),
    send: (command) => socket.send(JSON.stringify(command)),
    sendRaw: (text) => socket.send(text),
    sendInvalidUtf8: () => socket.send(Buffer.from([0xff]), { binary: false }),
    close: () => {
      socket.close()
      return closed
    },
    closed,
  }
  clients.push(client)
  return client
}

function ofType(type: ServerMessage['type']): MessageMatcher {
  return (message) => message.type === type
}

function stateWhere(matches: (view: SessionView) => boolean): MessageMatcher {
  return (message) => message.type === 'state' && matches(message.view)
}

type Welcome = Extract<ServerMessage, { type: 'welcome' }>

async function joinAs(sessionId: string, command: ClientCommand): Promise<{ client: TestClient; welcome: Welcome }> {
  const client = connect(sessionId)
  await client.next(ofType('state'))
  client.send(command)
  return { client, welcome: (await client.next(ofType('welcome'))) as Welcome }
}

async function joinedClient(sessionId: string, name: string): Promise<TestClient> {
  return (await joinAs(sessionId, { type: 'join', name })).client
}

describe('POST /api/sessions', () => {
  it('creates a session and returns its id', async () => {
    const response = await postSession({ challenge: 'Onboarding is slow' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: expect.any(String) })
  })

  it('responds 400 with the reason when the session is rejected', async () => {
    const response = await postSession({ challenge: 'Onboarding is slow', burstSeconds: 5 })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.stringContaining('Burst length') })
  })

  it('responds 400 when the body has no challenge', async () => {
    const response = await postSession({})

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Challenge is required' })
  })
})

describe('/ws', () => {
  it('sends a spectator welcome followed by the state', async () => {
    const sessionId = await createSessionId()
    const client = connect(sessionId)

    await client.next(ofType('state'))

    expect(client.received[0]).toEqual({ type: 'welcome', participantId: null, serverNow: expect.any(Number) })
    expect(client.received[1]).toMatchObject({ type: 'state', view: { id: sessionId, phase: 'lobby' } })
  })

  it('welcomes a joining client with its participant id and resume token', async () => {
    const client = connect(await createSessionId())
    await client.next(ofType('state'))

    client.send({ type: 'join', name: 'Ada' })

    expect(await client.next(ofType('welcome'))).toEqual({
      type: 'welcome',
      participantId: expect.any(String),
      resumeToken: expect.any(String),
      serverNow: expect.any(Number),
    })
  })

  it('never broadcasts a resume token in state', async () => {
    const sessionId = await createSessionId()
    const { welcome } = await joinAs(sessionId, { type: 'join', name: 'Ada' })
    const grace = await joinedClient(sessionId, 'Grace')

    await grace.next(stateWhere((view) => view.participants.length === 2))

    expect(JSON.stringify(grace.received.filter(ofType('state')))).not.toContain(welcome.resumeToken)
  })

  it('rejoins a participant on a new socket with its resume token', async () => {
    const sessionId = await createSessionId()
    const first = await joinAs(sessionId, { type: 'join', name: 'Ada' })

    const again = await joinAs(sessionId, { type: 'join', name: 'Ada', resumeToken: first.welcome.resumeToken })

    expect(again.welcome.participantId).toBe(first.welcome.participantId)
    await again.client.next(stateWhere((view) => view.participants.length === 1))
  })

  it("does not let another client take over a participant with its id", async () => {
    const sessionId = await createSessionId()
    const ada = await joinAs(sessionId, { type: 'join', name: 'Ada' })

    const mallory = await joinAs(sessionId, { type: 'join', name: 'Mallory', resumeToken: ada.welcome.participantId! })

    expect(mallory.welcome.participantId).not.toBe(ada.welcome.participantId)
    const state = await ada.client.next(stateWhere((view) => view.participants.length === 2))
    expect(state).toMatchObject({ view: { participants: [{ id: ada.welcome.participantId, name: 'Ada' }, { name: 'Mallory' }] } })
  })

  it('broadcasts joins and phase changes to every client', async () => {
    const sessionId = await createSessionId()
    const ada = await joinedClient(sessionId, 'Ada')
    const grace = await joinedClient(sessionId, 'Grace')

    await ada.next(stateWhere((view) => view.participants.length === 2))
    await grace.next(stateWhere((view) => view.participants.length === 2))
    ada.send({ type: 'advance', fromPhase: 'lobby' } satisfies ClientCommand)

    await ada.next(stateWhere((view) => view.phase === 'burst'))
    await grace.next(stateWhere((view) => view.phase === 'burst'))
  })

  it.each([['not json'], [JSON.stringify({ name: 'no type' })], [JSON.stringify('join')]])(
    'rejects the unparseable message %s to its sender only',
    async (message) => {
      const sessionId = await createSessionId()
      const sender = await joinedClient(sessionId, 'Ada')
      const bystander = await joinedClient(sessionId, 'Grace')

      sender.sendRaw(message)
      await sender.next(ofType('rejected'))
      sender.send({ type: 'advance', fromPhase: 'lobby' })
      await bystander.next(stateWhere((view) => view.phase === 'burst'))

      expect(bystander.received.filter(ofType('rejected'))).toEqual([])
    },
  )

  it('rejects a join without a name and keeps serving the session', async () => {
    const sessionId = await createSessionId()
    const client = connect(sessionId)
    await client.next(ofType('state'))

    client.send({ type: 'join' })

    expect(await client.next(ofType('rejected'))).toEqual({ type: 'rejected', reason: 'Invalid message' })
    await joinedClient(sessionId, 'Ada')
  })

  it('neither saves nor broadcasts a stale advance', async () => {
    const ada = await joinedClient(await createSessionId(), 'Ada')
    ada.send({ type: 'advance', fromPhase: 'lobby' } satisfies ClientCommand)
    await ada.next(stateWhere((view) => view.phase === 'burst'))
    const save = vi.spyOn(repository, 'save')
    const messageCount = ada.received.length

    ada.send({ type: 'advance', fromPhase: 'lobby' } satisfies ClientCommand)
    ada.sendRaw('not json')
    await ada.next(ofType('rejected'))

    expect(save).not.toHaveBeenCalled()
    expect(ada.received.slice(messageCount)).toEqual([{ type: 'rejected', reason: 'Invalid message' }])
  })

  it('rejects a command the session refuses with its reason', async () => {
    const client = connect(await createSessionId())
    await client.next(ofType('state'))

    client.send({ type: 'join', name: '   ' })

    expect(await client.next(ofType('rejected'))).toEqual({ type: 'rejected', reason: expect.stringContaining('Name') })
  })

  it('drops a socket that sends a malformed frame and keeps serving the session', async () => {
    const sessionId = await createSessionId()
    const client = connect(sessionId)
    await client.next(ofType('state'))

    client.sendInvalidUtf8()

    expect(await client.closed).toBe(1007)
    await joinedClient(sessionId, 'Ada')
  })

  it('closes with 4404 for an unknown session', async () => {
    expect(await connect('unknown').closed).toBe(4404)
  })
})
