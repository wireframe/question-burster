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

export interface SessionView {
  id: string
  challenge: string
  burstSeconds: number
  phase: Phase
  endsAt: number | null
  participants: ParticipantView[]
}
