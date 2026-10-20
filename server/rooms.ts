/**
 * Live sessions: a Room applies each socket's commands to its session, persists the result,
 * and broadcasts each socket its own projection. The RoomHub loads rooms on first use.
 */
import type { WebSocket } from 'ws'
import type { ClientCommand, ServerMessage } from '../shared/protocol'
import type { SessionRepository } from './db'
import { contextFrom, type Clock } from './session/clock'
import { parseCommand } from './session/commands'
import { CommandRejected } from './session/errors'
import { projectForClient } from './session/projection'
import { applyCommand, type JoinedParticipant } from './session/reducer'
import type { SessionState } from './session/state'

export interface RoomDependencies {
  repository: SessionRepository
  clock: Clock
}

export class RoomHub {
  private readonly rooms = new Map<string, Room>()

  constructor(private readonly deps: RoomDependencies) {}

  find(sessionId: string): Room | undefined {
    return this.rooms.get(sessionId) ?? this.load(sessionId)
  }

  private load(sessionId: string): Room | undefined {
    const state = this.deps.repository.load(sessionId)
    if (!state) return undefined
    const room = new Room(state, this.deps)
    this.rooms.set(sessionId, room)
    return room
  }
}

class Room {
  private readonly participantBySocket = new Map<WebSocket, string | null>()

  constructor(
    private state: SessionState,
    private readonly deps: RoomDependencies,
  ) {}

  connect(socket: WebSocket): void {
    this.participantBySocket.set(socket, null)
    socket.on('message', (data) => this.receive(socket, String(data)))
    socket.on('close', () => this.participantBySocket.delete(socket))
    socket.on('error', ignoreProtocolError)
    this.welcome(socket)
    this.sendState(socket)
  }

  private receive(socket: WebSocket, data: string): void {
    try {
      this.handle(socket, parseCommand(parseJson(data)))
    } catch (error) {
      if (!(error instanceof CommandRejected)) throw error
      send(socket, { type: 'rejected', reason: error.message })
    }
  }

  private handle(socket: WebSocket, command: ClientCommand): void {
    const actorId = this.participantOf(socket)
    const result = applyCommand(this.state, { actorId, command, ctx: contextFrom(this.deps.clock) })
    if (result.state === this.state && !result.joined) return
    this.state = result.state
    this.deps.repository.save(this.state)
    if (result.joined) this.identify(socket, result.joined)
    this.broadcast()
  }

  private identify(socket: WebSocket, { participantId, resumeToken }: JoinedParticipant): void {
    this.participantBySocket.set(socket, participantId)
    this.welcome(socket, resumeToken)
  }

  private welcome(socket: WebSocket, resumeToken?: string): void {
    const participantId = this.participantOf(socket)
    send(socket, { type: 'welcome', participantId, resumeToken, serverNow: this.deps.clock.now() })
  }

  private broadcast(): void {
    this.participantBySocket.forEach((_participantId, socket) => this.sendState(socket))
  }

  private sendState(socket: WebSocket): void {
    send(socket, { type: 'state', view: projectForClient(this.state, this.participantOf(socket)) })
  }

  private participantOf(socket: WebSocket): string | null {
    return this.participantBySocket.get(socket) ?? null
  }
}

/** ws already closes the socket on a protocol error; without a listener the emit would crash the process. */
function ignoreProtocolError(): void {}

function send(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message))
}

function parseJson(data: string): unknown {
  try {
    return JSON.parse(data)
  } catch {
    throw new CommandRejected('Invalid message')
  }
}
