/**
 * Pure session transitions: each returns a new state and never mutates its input.
 * Invalid input throws CommandRejected with the reason for the actor.
 */
import {
  DEFAULT_BURST_SECONDS,
  MAX_BURST_SECONDS,
  MAX_NAME_LENGTH,
  MIN_BURST_SECONDS,
  nextPhase,
  type ClientCommand,
  type CreateSessionRequest,
  type Phase,
} from '../../shared/protocol'
import { burstLengthRejected, challengeRequired, CommandRejected } from './errors'
import type { CommandContext, Participant, SessionState } from './state'

type JoinCommand = Extract<ClientCommand, { type: 'join' }>
type AdvanceCommand = Extract<ClientCommand, { type: 'advance' }>

export interface JoinedParticipant {
  participantId: string
  resumeToken: string
}

interface CommandResult {
  state: SessionState
  joined?: JoinedParticipant
}

export function createSession(request: CreateSessionRequest, ctx: CommandContext): SessionState {
  return {
    id: ctx.newId(),
    challenge: validChallenge(request.challenge),
    burstSeconds: validBurstSeconds(request.burstSeconds ?? DEFAULT_BURST_SECONDS),
    phase: 'lobby',
    endsAt: null,
    participants: {},
  }
}

export function applyCommand(
  state: SessionState,
  { command, ctx }: { actorId: string | null; command: ClientCommand; ctx: CommandContext },
): CommandResult {
  switch (command.type) {
    case 'join':
      return join(state, { command, ctx })
    case 'advance':
      return { state: advance(state, { command, ctx }) }
  }
}

function join(state: SessionState, { command, ctx }: { command: JoinCommand; ctx: CommandContext }): CommandResult {
  const name = validName(command.name)
  const existing = findByResumeToken(state, command.resumeToken)
  const participant = existing ? { ...existing, name } : newParticipant(name, ctx)
  return {
    state: { ...state, participants: { ...state.participants, [participant.id]: participant } },
    joined: { participantId: participant.id, resumeToken: participant.resumeToken },
  }
}

function findByResumeToken(state: SessionState, resumeToken: string | undefined): Participant | undefined {
  if (resumeToken === undefined) return undefined
  return Object.values(state.participants).find((participant) => participant.resumeToken === resumeToken)
}

function newParticipant(name: string, ctx: CommandContext): Participant {
  return { id: ctx.newId(), resumeToken: ctx.newId(), name, done: false }
}

function advance(state: SessionState, { command, ctx }: { command: AdvanceCommand; ctx: CommandContext }): SessionState {
  const next = nextPhase(state.phase)
  if (command.fromPhase !== state.phase || !next) return state
  return enterPhase(state, { phase: next, ctx })
}

function enterPhase(state: SessionState, { phase, ctx }: { phase: Phase; ctx: CommandContext }): SessionState {
  const endsAt = phase === 'burst' ? ctx.now + state.burstSeconds * 1000 : state.endsAt
  return { ...state, phase, endsAt }
}

function validChallenge(challenge: string): string {
  const trimmed = challenge.trim()
  if (!trimmed) throw challengeRequired()
  return trimmed
}

function validBurstSeconds(burstSeconds: number): number {
  if (burstSeconds < MIN_BURST_SECONDS || burstSeconds > MAX_BURST_SECONDS) throw burstLengthRejected()
  return burstSeconds
}

function validName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > MAX_NAME_LENGTH) {
    throw new CommandRejected(`Name must be 1–${MAX_NAME_LENGTH} characters`)
  }
  return trimmed
}
