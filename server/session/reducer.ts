/**
 * Pure session transitions: each returns a new state and never mutates its input.
 * Invalid input throws CommandRejected with the reason for the actor.
 */
import {
  DEFAULT_BURST_SECONDS,
  MAX_BURST_SECONDS,
  MAX_NAME_LENGTH,
  MAX_QUESTION_LENGTH,
  MIN_BURST_SECONDS,
  nextPhase,
  type ClientCommand,
  type CreateSessionRequest,
  type Phase,
} from '../../shared/protocol'
import { burstLengthRejected, challengeRequired, CommandRejected } from './errors'
import type { CommandContext, Participant, Question, SessionState } from './state'
import { burstClosesAt } from './timer'

type JoinCommand = Extract<ClientCommand, { type: 'join' }>
type AdvanceCommand = Extract<ClientCommand, { type: 'advance' }>
type SubmitQuestionCommand = Extract<ClientCommand, { type: 'submitQuestion' }>

export interface JoinedParticipant {
  participantId: string
  resumeToken: string
}

export interface CommandResult {
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
    questions: {},
  }
}

export function applyCommand(
  state: SessionState,
  { actorId, command, ctx }: { actorId: string | null; command: ClientCommand; ctx: CommandContext },
): CommandResult {
  switch (command.type) {
    case 'join':
      return join(state, { command, ctx })
    case 'advance':
      return { state: advance(state, { command, ctx }) }
    case 'submitQuestion':
      return { state: submitQuestion(state, { actorId, command, ctx }) }
    case 'markDone':
      return { state: markDone(state, actorId) }
  }
}

function join(state: SessionState, { command, ctx }: { command: JoinCommand; ctx: CommandContext }): CommandResult {
  const name = validName(command.name)
  const existing = findByResumeToken(state, command.resumeToken)
  const participant = existing ? { ...existing, name } : newParticipant(name, ctx)
  return {
    state: withParticipant(state, participant),
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

function withParticipant(state: SessionState, participant: Participant): SessionState {
  return { ...state, participants: { ...state.participants, [participant.id]: participant } }
}

function submitQuestion(
  state: SessionState,
  { actorId, command, ctx }: { actorId: string | null; command: SubmitQuestionCommand; ctx: CommandContext },
): SessionState {
  const author = requireParticipant(state, actorId)
  requireBurstOpen(state, ctx.now)
  const question: Question = { id: ctx.newId(), authorId: author.id, text: validQuestionText(command.text) }
  return { ...state, questions: { ...state.questions, [question.id]: question } }
}

function markDone(state: SessionState, actorId: string | null): SessionState {
  const participant = requireParticipant(state, actorId)
  requireBurst(state)
  if (participant.done) return state
  return withParticipant(state, { ...participant, done: true })
}

function requireParticipant(state: SessionState, actorId: string | null): Participant {
  const participant = actorId === null ? undefined : state.participants[actorId]
  if (!participant) throw new CommandRejected('Join the session first')
  return participant
}

function requireBurst(state: SessionState): void {
  if (state.phase !== 'burst') throw new CommandRejected('The burst is not running')
}

function requireBurstOpen(state: SessionState, now: number): void {
  requireBurst(state)
  if (now > burstClosesAt(state)) throw new CommandRejected('The burst has ended')
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

function validQuestionText(text: string): string {
  return trimmedWithin(text, { label: 'Question', maxLength: MAX_QUESTION_LENGTH })
}

function validName(name: string): string {
  return trimmedWithin(name, { label: 'Name', maxLength: MAX_NAME_LENGTH })
}

function trimmedWithin(text: string, { label, maxLength }: { label: string; maxLength: number }): string {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > maxLength) throw new CommandRejected(`${label} must be 1–${maxLength} characters`)
  return trimmed
}
