import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClientCommand, ServerMessage } from '../../shared/protocol'
import { buildView } from '../test-support'
import { createSessionClient, type WebSocketLike } from './sessionClient'

class FakeSocket implements WebSocketLike {
  sent: ClientCommand[] = []
  closed = false
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  send(data: string) { this.sent.push(JSON.parse(data)) }
  close() { this.closed = true }
  open() { this.onopen?.(new Event('open')) }
  serverClose(reason: string) { this.onclose?.(new CloseEvent('close', { reason })) }
  receive(message: ServerMessage) { this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) })) }
}

const view = buildView()

class MemoryStorage {
  private items = new Map<string, string>()
  getItem(key: string) { return this.items.get(key) ?? null }
  setItem(key: string, value: string) { this.items.set(key, value) }
}

let storage: MemoryStorage

function createClient() {
  const sockets: FakeSocket[] = []
  const paths: string[] = []
  const factory = (path: string) => {
    paths.push(path)
    const socket = new FakeSocket()
    sockets.push(socket)
    return socket
  }
  const client = createSessionClient({ socketFactory: factory, storage }, 's1')
  return { client, sockets, paths }
}

function connect() {
  const { client, sockets, paths } = createClient()
  client.connect()
  return { client, socket: sockets[0], paths }
}

describe('createSessionClient', () => {
  beforeEach(() => {
    storage = new MemoryStorage()
    vi.spyOn(Date, 'now').mockReturnValue(1000)
  })
  afterEach(() => vi.restoreAllMocks())

  it('connects to the socket path for its session', () => {
    expect(connect().paths).toEqual(['/ws?session=s1'])
  })

  it('opens no socket until connect is called', () => {
    expect(createClient().sockets).toEqual([])
  })

  it('opens a fresh socket when connecting again after closing', () => {
    const { client, sockets } = createClient()

    client.connect()
    client.close()
    client.connect()
    client.send({ type: 'advance', fromPhase: 'lobby' })

    expect(sockets).toHaveLength(2)
    expect(sockets[0].closed).toBe(true)
    expect(sockets[1].sent).toEqual([{ type: 'advance', fromPhase: 'lobby' }])
  })

  it('exposes the reason when the server closes the socket', () => {
    const { client, socket } = connect()

    socket.serverClose('Session not found')

    expect(client.getSnapshot().lastRejection).toBe('Session not found')
  })

  it('ignores the close of a socket it closed itself', () => {
    const { client, sockets } = createClient()

    client.connect()
    client.close()
    client.connect()
    sockets[0].serverClose('')

    expect(client.getSnapshot().lastRejection).toBeNull()
  })

  it('exposes the latest view, participant id and clock offset', () => {
    const { client, socket } = connect()

    socket.receive({ type: 'welcome', participantId: 'p1', serverNow: 1500 })
    socket.receive({ type: 'state', view })

    expect(client.getSnapshot()).toMatchObject({ view, participantId: 'p1', clockOffset: 500 })
  })

  it('exposes the last rejection reason', () => {
    const { client, socket } = connect()

    socket.receive({ type: 'rejected', reason: 'wrong phase' })

    expect(client.getSnapshot().lastRejection).toBe('wrong phase')
  })

  it('clears the last rejection when dismissed', () => {
    const { client, socket } = connect()

    socket.receive({ type: 'rejected', reason: 'wrong phase' })
    client.dismissRejection()

    expect(client.getSnapshot().lastRejection).toBeNull()
  })

  it('stores the resume token and name after joining', () => {
    const { client, socket } = connect()

    client.join('Ada')
    socket.receive({ type: 'welcome', participantId: 'p1', resumeToken: 't1', serverNow: 1000 })

    expect(socket.sent).toEqual([{ type: 'join', name: 'Ada' }])
    expect(JSON.parse(storage.getItem('qb:s1')!)).toEqual({ resumeToken: 't1', name: 'Ada' })
  })

  it('keeps the stored resume token when a welcome carries none', () => {
    storage.setItem('qb:s1', JSON.stringify({ resumeToken: 't1', name: 'Ada' }))
    const { socket } = connect()

    socket.receive({ type: 'welcome', participantId: null, serverNow: 1000 })

    expect(JSON.parse(storage.getItem('qb:s1')!)).toEqual({ resumeToken: 't1', name: 'Ada' })
  })

  it('rejoins with the stored resume token when a new socket opens', () => {
    storage.setItem('qb:s1', JSON.stringify({ resumeToken: 't1', name: 'Ada' }))
    const { socket } = connect()

    socket.open()

    expect(socket.sent).toEqual([{ type: 'join', name: 'Ada', resumeToken: 't1' }])
  })

  it('does not rejoin when nothing is stored', () => {
    const { socket } = connect()

    socket.open()

    expect(socket.sent).toEqual([])
  })

  describe('rejoining', () => {
    function rejoiningClient() {
      storage.setItem('qb:s1', JSON.stringify({ resumeToken: 't1', name: 'Ada' }))
      const connected = connect()
      connected.socket.open()
      return connected
    }

    it('is false before the socket opens', () => {
      storage.setItem('qb:s1', JSON.stringify({ resumeToken: 't1', name: 'Ada' }))

      expect(connect().client.getSnapshot().rejoining).toBe(false)
    })

    it('is false after opening with nothing stored', () => {
      const { client, socket } = connect()

      socket.open()

      expect(client.getSnapshot().rejoining).toBe(false)
    })

    it('stays true through the spectator welcome and state sent before the rejoin reply', () => {
      const { client, socket } = rejoiningClient()

      socket.receive({ type: 'welcome', participantId: null, serverNow: 1000 })
      socket.receive({ type: 'state', view })

      expect(client.getSnapshot().rejoining).toBe(true)
    })

    it('ends when the server welcomes the participant', () => {
      const { client, socket } = rejoiningClient()

      socket.receive({ type: 'welcome', participantId: 'p1', resumeToken: 't1', serverNow: 1000 })

      expect(client.getSnapshot()).toMatchObject({ rejoining: false, participantId: 'p1' })
    })

    it('ends when the rejoin is rejected', () => {
      const { client, socket } = rejoiningClient()

      socket.receive({ type: 'rejected', reason: 'nope' })

      expect(client.getSnapshot().rejoining).toBe(false)
    })

    it('ends when the server closes the socket', () => {
      const { client, socket } = rejoiningClient()

      socket.serverClose('Session not found')

      expect(client.getSnapshot().rejoining).toBe(false)
    })
  })

  it('notifies subscribers with a new snapshot only when something changes', () => {
    const { client, socket } = connect()
    let notifications = 0
    const unsubscribe = client.subscribe(() => notifications++)
    const before = client.getSnapshot()

    socket.receive({ type: 'state', view })
    unsubscribe()
    socket.receive({ type: 'rejected', reason: 'nope' })

    expect(notifications).toBe(1)
    expect(client.getSnapshot()).not.toBe(before)
  })

  it('returns the same snapshot when nothing has changed', () => {
    const { client } = connect()

    expect(client.getSnapshot()).toBe(client.getSnapshot())
  })

  it('sends commands as JSON and closes the socket', () => {
    const { client, socket } = connect()

    client.send({ type: 'advance', fromPhase: 'lobby' })
    client.close()

    expect(socket.sent).toEqual([{ type: 'advance', fromPhase: 'lobby' }])
    expect(socket.closed).toBe(true)
  })
})
