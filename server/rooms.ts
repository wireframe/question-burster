/**
 * Live sessions: a Room applies each socket's commands to its session, persists the result,
 * and broadcasts each socket its own projection. It also ends the burst when its time runs out.
 * The RoomHub loads rooms on first use.
 */
import type { ClientCommand, ServerMessage } from '../shared/protocol'
import type { SessionRepository } from './db'
import { contextFrom, type Clock } from './session/clock'
import { parseCommand } from './session/commands'
import { CommandRejected } from './session/errors'
import { projectForClient } from './session/projection'
import { applyCommand, type CommandResult, type JoinedParticipant } from './session/reducer'
import type { SessionState } from './session/state'
import { burstTimeoutMs } from './session/timer'

export interface RoomDependencies {
  repository: SessionRepository
  clock: Clock
}

/** The slice of a ws WebSocket a Room uses. */
export interface RoomSocket {
  send(data: string): void
  on(event: 'message' | 'close' | 'error', listener: (data: unknown) => void): unknown
}

const SYSTEM_ACTOR = 'system'
const END_BURST: ClientCommand = { type: 'advance', fromPhase: 'burst' }

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
  private readonly participantBySocket = new Map<RoomSocket, string | null>()
  private burstTimeout: ReturnType<typeof setTimeout> | undefined

  constructor(
    private state: SessionState,
    private readonly deps: RoomDependencies,
  ) {
    this.scheduleBurstTimeout()
  }

  connect(socket: RoomSocket): void {
    this.participantBySocket.set(socket, null)
    socket.on('message', (data) => this.receive(socket, String(data)))
    socket.on('close', () => this.participantBySocket.delete(socket))
    socket.on('error', ignoreProtocolError)
    this.welcome(socket)
    this.sendState(socket)
  }

  private receive(socket: RoomSocket, data: string): void {
    try {
      this.handle(socket, parseCommand(parseJson(data)))
    } catch (error) {
      if (!(error instanceof CommandRejected)) throw error
      send(socket, { type: 'rejected', reason: error.message })
    }
  }

  private handle(socket: RoomSocket, command: ClientCommand): void {
    const result = this.apply(this.participantOf(socket), command)
    if (result.joined) this.identify(socket, result.joined)
    this.commit(result)
  }

  private endBurst(): void {
    this.commit(this.apply(SYSTEM_ACTOR, END_BURST))
  }

  private apply(actorId: string | null, command: ClientCommand): CommandResult {
    return applyCommand(this.state, { actorId, command, ctx: contextFrom(this.deps.clock) })
  }

  private commit(result: CommandResult): void {
    if (result.state === this.state && !result.joined) return
    const previousPhase = this.state.phase
    this.state = result.state
    this.deps.repository.save(this.state)
    if (this.state.phase !== previousPhase) this.scheduleBurstTimeout()
    this.broadcast()
  }

  private scheduleBurstTimeout(): void {
    clearTimeout(this.burstTimeout)
    const delay = burstTimeoutMs(this.state, this.deps.clock.now())
    if (delay === null) return
    this.burstTimeout = setTimeout(() => this.endBurst(), delay)
  }

  private identify(socket: RoomSocket, { participantId, resumeToken }: JoinedParticipant): void {
    this.participantBySocket.set(socket, participantId)
    this.welcome(socket, resumeToken)
  }

  private welcome(socket: RoomSocket, resumeToken?: string): void {
    const participantId = this.participantOf(socket)
    send(socket, { type: 'welcome', participantId, resumeToken, serverNow: this.deps.clock.now() })
  }

  private broadcast(): void {
    this.participantBySocket.forEach((_participantId, socket) => this.sendState(socket))
  }

  private sendState(socket: RoomSocket): void {
    send(socket, { type: 'state', view: projectForClient(this.state, this.participantOf(socket)) })
  }

  private participantOf(socket: RoomSocket): string | null {
    return this.participantBySocket.get(socket) ?? null
  }
}

/** ws already closes the socket on a protocol error; without a listener the emit would crash the process. */
function ignoreProtocolError(): void {}

function send(socket: RoomSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message))
}

function parseJson(data: string): unknown {
  try {
    return JSON.parse(data)
  } catch {
    throw new CommandRejected('Invalid message')
  }
}
