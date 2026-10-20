import type { SessionState } from './state'

export const BURST_GRACE_MS = 2000

export function burstClosesAt(state: SessionState): number {
  return state.endsAt! + BURST_GRACE_MS
}

export function burstTimeoutMs(state: SessionState, now: number): number | null {
  if (state.phase !== 'burst') return null
  return Math.max(0, burstClosesAt(state) - now)
}
