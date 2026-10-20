import {
  SESSION_NOT_FOUND_CLOSE_CODE,
  WS_PATH,
  type ClientCommand,
  type ServerMessage,
  type SessionView,
} from '../../shared/protocol'

export interface WebSocketLike {
  send(data: string): void
  close(): void
  onopen: ((event: Event) => void) | null
  onmessage: ((event: MessageEvent<string>) => void) | null
  onclose: ((event: CloseEvent) => void) | null
}

type SocketFactory = (path: string) => WebSocketLike

type IdentityStorage = Pick<Storage, 'getItem' | 'setItem'>

interface SessionClientDependencies {
  socketFactory: SocketFactory
  storage: IdentityStorage
}

export interface SessionSnapshot {
  view: SessionView | null
  participantId: string | null
  clockOffset: number
  lastRejection: string | null
  rejoining: boolean
}

export interface SessionClient {
  subscribe(listener: () => void): () => void
  getSnapshot(): SessionSnapshot
  send(command: ClientCommand): void
  join(name: string): void
  dismissRejection(): void
  connect(): void
  close(): void
}

interface StoredIdentity {
  resumeToken?: string
  name?: string
}

const INITIAL_SNAPSHOT: SessionSnapshot = {
  view: null,
  participantId: null,
  clockOffset: 0,
  lastRejection: null,
  rejoining: false,
}

const RECONNECT_DELAY_MS = 1000

function sessionSocketPath(sessionId: string): string {
  return `${WS_PATH}?session=${encodeURIComponent(sessionId)}`
}

export function createSessionClient(
  { socketFactory, storage }: SessionClientDependencies,
  sessionId: string,
): SessionClient {
  const storageKey = `qb:${sessionId}`
  const listeners = new Set<() => void>()
  let socket: WebSocketLike | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let snapshot = INITIAL_SNAPSHOT

  function readIdentity(): StoredIdentity {
    return JSON.parse(storage.getItem(storageKey) ?? '{}')
  }

  function storeIdentity(identity: StoredIdentity) {
    storage.setItem(storageKey, JSON.stringify(identity))
  }

  function update(changes: Partial<SessionSnapshot>) {
    snapshot = { ...snapshot, ...changes }
    listeners.forEach((listener) => listener())
  }

  function send(command: ClientCommand) {
    socket!.send(JSON.stringify(command))
  }

  function join(name: string) {
    const { resumeToken } = readIdentity()
    storeIdentity({ resumeToken, name })
    send({ type: 'join', name, resumeToken })
  }

  function dismissRejection() {
    update({ lastRejection: null })
  }

  function rejoinWithStoredIdentity() {
    const { resumeToken, name } = readIdentity()
    if (!resumeToken || !name) return
    send({ type: 'join', name, resumeToken })
    update({ rejoining: true })
  }

  function receiveWelcome({ participantId, resumeToken, serverNow }: Extract<ServerMessage, { type: 'welcome' }>) {
    if (resumeToken) storeIdentity({ ...readIdentity(), resumeToken })
    const rejoining = snapshot.rejoining && !participantId
    update({ participantId, rejoining, clockOffset: serverNow - Date.now() })
  }

  function receive(message: ServerMessage) {
    switch (message.type) {
      case 'welcome':
        return receiveWelcome(message)
      case 'state':
        return update({ view: message.view })
      case 'rejected':
        return update({ lastRejection: message.reason, rejoining: false })
    }
  }

  function connect() {
    const opened = socketFactory(sessionSocketPath(sessionId))
    opened.onopen = resume
    opened.onmessage = (event) => receive(JSON.parse(event.data))
    opened.onclose = (event) => handleServerClose(opened, event)
    socket = opened
  }

  function resume() {
    update({ lastRejection: null })
    rejoinWithStoredIdentity()
  }

  function handleServerClose(closed: WebSocketLike, { code, reason }: CloseEvent) {
    if (closed !== socket) return
    update({ view: null, lastRejection: reason || 'Connection lost', rejoining: false })
    if (code !== SESSION_NOT_FOUND_CLOSE_CODE) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
  }

  function close() {
    clearTimeout(reconnectTimer)
    const closing = socket!
    socket = undefined
    closing.close()
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    send,
    join,
    dismissRejection,
    connect,
    close,
  }
}
