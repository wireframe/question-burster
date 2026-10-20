import {
  DEFAULT_BURST_SECONDS,
  MAX_BURST_SECONDS,
  MAX_LABEL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_QUESTION_LENGTH,
  MIN_BURST_SECONDS,
  nextPhase,
  type ClientCommand,
  type CreateSessionRequest,
  type Phase,
} from '../../shared/protocol'
import { burstLengthRejected, challengeRequired, CommandRejected } from './errors'
import type { CommandContext, Group, GroupDraft, Participant, Question, SessionState, SystemCommand } from './state'
import { burstClosesAt } from './timer'

type JoinCommand = Extract<ClientCommand, { type: 'join' }>
type AdvanceCommand = Extract<ClientCommand, { type: 'advance' }>
type SubmitQuestionCommand = Extract<ClientCommand, { type: 'submitQuestion' }>
type MergeCommand = Extract<ClientCommand, { type: 'merge' }>
type SplitCommand = Extract<ClientCommand, { type: 'split' }>
type RewordCommand = Extract<ClientCommand, { type: 'reword' }>
type GroupingCompletedCommand = Extract<SystemCommand, { type: 'groupingCompleted' }>

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
    groupingStatus: 'idle',
    groups: {},
  }
}

export function applyCommand(
  state: SessionState,
  { actorId, command, ctx }: { actorId: string | null; command: ClientCommand | SystemCommand; ctx: CommandContext },
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
    case 'merge':
      return { state: merge(state, { actorId, command }) }
    case 'split':
      return { state: split(state, { actorId, command, ctx }) }
    case 'reword':
      return { state: reword(state, { actorId, command }) }
    case 'groupingCompleted':
      return { state: completeGrouping(state, { command, ctx }) }
  }
}

export function singletonGroups(questions: Question[]): GroupDraft[] {
  return questions.map(singletonGroup)
}

function singletonGroup(question: Question): GroupDraft {
  return { label: question.text, questionIds: [question.id] }
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

function merge(state: SessionState, { actorId, command }: { actorId: string | null; command: MergeCommand }): SessionState {
  requireConsolidating(state, actorId)
  if (command.sourceGroupId === command.targetGroupId) throw new CommandRejected("Can't merge a group into itself")
  const source = requireGroup(state, command.sourceGroupId)
  const target = requireGroup(state, command.targetGroupId)
  const merged = { ...target, questionIds: [...target.questionIds, ...source.questionIds] }
  return withGroups(withoutGroup(state, source.id), bumped(merged))
}

function split(
  state: SessionState,
  { actorId, command, ctx }: { actorId: string | null; command: SplitCommand; ctx: CommandContext },
): SessionState {
  requireConsolidating(state, actorId)
  const group = requireSplittable(state, command)
  const remaining = { ...group, questionIds: group.questionIds.filter((id) => id !== command.questionId) }
  const splitOut = newGroup(singletonGroup(state.questions[command.questionId]), ctx)
  return withGroups(state, bumped(remaining), splitOut)
}

function requireSplittable(state: SessionState, command: SplitCommand): Group {
  const group = requireGroup(state, command.groupId)
  if (!group.questionIds.includes(command.questionId)) throw new CommandRejected('Question not in group')
  if (group.questionIds.length === 1) throw new CommandRejected('Group has only one question')
  return group
}

function reword(state: SessionState, { actorId, command }: { actorId: string | null; command: RewordCommand }): SessionState {
  requireConsolidating(state, actorId)
  const group = requireGroup(state, command.groupId)
  if (command.baseVersion !== group.version) throw new CommandRejected('Group changed, refresh')
  return withGroups(state, bumped({ ...group, label: validLabel(command.label) }))
}

function requireConsolidating(state: SessionState, actorId: string | null): void {
  requireParticipant(state, actorId)
  if (state.phase !== 'consolidate') throw new CommandRejected('Groups can only change during consolidate')
  requireGroupingSettled(state)
}

function requireGroupingSettled(state: SessionState): void {
  if (isAwaitingGroups(state)) throw new CommandRejected('Grouping in progress')
}

function requireGroup(state: SessionState, groupId: string): Group {
  const group = state.groups[groupId]
  if (!group) throw new CommandRejected('Group not found')
  return group
}

function bumped(group: Group): Group {
  return { ...group, version: group.version + 1 }
}

function newGroup(draft: GroupDraft, ctx: CommandContext): Group {
  return { id: ctx.newId(), version: 0, ...draft }
}

function withGroups(state: SessionState, ...groups: Group[]): SessionState {
  return { ...state, groups: { ...state.groups, ...byId(groups) } }
}

function byId(groups: Group[]): Record<string, Group> {
  return Object.fromEntries(groups.map((group) => [group.id, group]))
}

function withoutGroup(state: SessionState, groupId: string): SessionState {
  const groups = Object.fromEntries(Object.entries(state.groups).filter(([id]) => id !== groupId))
  return { ...state, groups }
}

function completeGrouping(
  state: SessionState,
  { command, ctx }: { command: GroupingCompletedCommand; ctx: CommandContext },
): SessionState {
  if (!isAwaitingGroups(state)) return state
  const groups = command.groups.map((draft) => newGroup(draft, ctx))
  return { ...state, groupingStatus: 'ready', groups: byId(groups) }
}

export function isAwaitingGroups(state: SessionState): boolean {
  return state.phase === 'consolidate' && state.groupingStatus === 'pending'
}

function advance(state: SessionState, { command, ctx }: { command: AdvanceCommand; ctx: CommandContext }): SessionState {
  const next = nextPhase(state.phase)
  if (command.fromPhase !== state.phase || !next) return state
  requireGroupingSettled(state)
  return enterPhase(state, { phase: next, ctx })
}

type PhaseEntry = (state: SessionState, ctx: CommandContext) => Partial<SessionState>

const ON_ENTER: Partial<Record<Phase, PhaseEntry>> = {
  burst: (state, ctx) => ({ endsAt: ctx.now + state.burstSeconds * 1000 }),
  consolidate: () => ({ groupingStatus: 'pending', groups: {} }),
}

function enterPhase(state: SessionState, { phase, ctx }: { phase: Phase; ctx: CommandContext }): SessionState {
  return { ...state, phase, ...ON_ENTER[phase]?.(state, ctx) }
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

function validLabel(label: string): string {
  return trimmedWithin(label, { label: 'Label', maxLength: MAX_LABEL_LENGTH })
}

function validName(name: string): string {
  return trimmedWithin(name, { label: 'Name', maxLength: MAX_NAME_LENGTH })
}

function trimmedWithin(text: string, { label, maxLength }: { label: string; maxLength: number }): string {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > maxLength) throw new CommandRejected(`${label} must be 1–${maxLength} characters`)
  return trimmed
}
