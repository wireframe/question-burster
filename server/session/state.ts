/** The authoritative session state held by the server. It is never sent to clients as is. */
import type { Phase } from '../../shared/protocol'

export interface Participant {
  id: string
  /** Secret proof of identity for rejoining; only ever sent to the participant's own socket. */
  resumeToken: string
  name: string
  done: boolean
}

export interface SessionState {
  id: string
  challenge: string
  burstSeconds: number
  phase: Phase
  endsAt: number | null
  participants: Record<string, Participant>
}

export interface CommandContext {
  now: number
  newId: () => string
}
