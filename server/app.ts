/** The HTTP API plus the WebSocket endpoint at WS_PATH?session=<id>, served from one http.Server. */
import express, { type NextFunction, type Request, type Response } from 'express'
import http from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import {
  SESSIONS_PATH,
  WS_PATH,
  type CreateSessionResponse,
  type ErrorResponse,
} from '../shared/protocol'
import { RoomHub, type RoomDependencies } from './rooms'
import { contextFrom } from './session/clock'
import { parseCreateSessionRequest } from './session/commands'
import { CommandRejected } from './session/errors'
import { createSession } from './session/reducer'

const SESSION_NOT_FOUND = 4404

export function createServer(deps: RoomDependencies): http.Server {
  const server = http.createServer(createApi(deps))
  const connectToRoom = roomConnector(new RoomHub(deps))
  const sockets = new WebSocketServer({ noServer: true })
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (url.pathname !== WS_PATH) return socket.destroy()
    sockets.handleUpgrade(request, socket, head, (ws) => connectToRoom(ws, url.searchParams.get('session')))
  })
  return server
}

function createApi({ repository, clock }: RoomDependencies): express.Express {
  const api = express()
  api.use(express.json())
  api.post(SESSIONS_PATH, (request, response: Response<CreateSessionResponse>) => {
    const state = createSession(parseCreateSessionRequest(request.body), contextFrom(clock))
    repository.save(state)
    response.json({ id: state.id })
  })
  api.use(rejectionAsBadRequest)
  return api
}

function rejectionAsBadRequest(
  error: unknown,
  _request: Request,
  response: Response<ErrorResponse>,
  next: NextFunction,
): void {
  if (!(error instanceof CommandRejected)) return next(error)
  response.status(400).json({ error: error.message })
}

function roomConnector(hub: RoomHub) {
  return (socket: WebSocket, sessionId: string | null): void => {
    const room = sessionId ? hub.find(sessionId) : undefined
    if (!room) return socket.close(SESSION_NOT_FOUND, 'Session not found')
    room.connect(socket)
  }
}
