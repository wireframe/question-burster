export const PHASE_ORDER = ['lobby', 'burst', 'consolidate', 'vote', 'results'] as const

export type Phase = (typeof PHASE_ORDER)[number]

export function nextPhase(phase: Phase): Phase | undefined {
  return PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1]
}

export function isFinalPhase(phase: Phase): boolean {
  return nextPhase(phase) === undefined
}

export const DEFAULT_BURST_SECONDS = 240
export const MIN_BURST_SECONDS = 30
export const MAX_BURST_SECONDS = 1800
export const MAX_NAME_LENGTH = 40
export const MAX_QUESTION_LENGTH = 280
export const MAX_LABEL_LENGTH = MAX_QUESTION_LENGTH

export const SESSIONS_PATH = '/api/sessions'
export const WS_PATH = '/ws'

export interface CreateSessionRequest {
  challenge: string
  burstSeconds?: number
}

export interface CreateSessionResponse {
  id: string
}

export interface ErrorResponse {
  error: string
}

export type ClientCommand =
  | { type: 'join'; name: string; resumeToken?: string }
  | { type: 'advance'; fromPhase: Phase }
  | { type: 'submitQuestion'; text: string }
  | { type: 'markDone' }
  | { type: 'merge'; sourceGroupId: string; targetGroupId: string }
  | { type: 'split'; groupId: string; questionId: string }
  | { type: 'reword'; groupId: string; label: string; baseVersion: number }

export type ServerMessage =
  | { type: 'welcome'; participantId: string | null; resumeToken?: string; serverNow: number }
  | { type: 'state'; view: SessionView }
  | { type: 'rejected'; reason: string }

export interface ParticipantView {
  id: string
  name: string
  questionCount: number
  done: boolean
}

export interface QuestionView {
  id: string
  text: string
}

export type GroupingStatus = 'idle' | 'pending' | 'ready'

export interface GroupView {
  id: string
  label: string
  version: number
  questions: QuestionView[]
}

export interface SessionView {
  id: string
  challenge: string
  burstSeconds: number
  phase: Phase
  endsAt: number | null
  participants: ParticipantView[]
  myQuestions: QuestionView[]
  groupingStatus: GroupingStatus
  groups: GroupView[]
}
