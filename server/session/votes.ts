import type { SessionState } from './state'

export function votesUsedBy(state: SessionState, participantId: string): number {
  return Object.values(state.votes[participantId] ?? {}).reduce((sum, count) => sum + count, 0)
}
