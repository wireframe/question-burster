import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ClientCommand } from '../../shared/protocol'
import { createSessionClient, type SessionClient, type SessionSnapshot, type WebSocketLike } from './sessionClient'

export interface Session extends SessionSnapshot {
  send: (command: ClientCommand) => void
  join: (name: string) => void
}

function openBrowserSocket(path: string): WebSocketLike {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
  return new WebSocket(`${scheme}://${location.host}${path}`)
}

function useConnectedClient(sessionId: string): SessionClient {
  const [client] = useState(() =>
    createSessionClient({ socketFactory: openBrowserSocket, storage: localStorage }, sessionId),
  )
  useEffect(() => {
    client.connect()
    return client.close
  }, [client])
  return client
}

/** Live state of one session, re-rendering whenever the server sends an update. */
export function useSession(sessionId: string): Session {
  const client = useConnectedClient(sessionId)
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot)
  return { ...snapshot, send: client.send, join: client.join }
}
