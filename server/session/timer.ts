/** When the running burst closes to new questions, and when the server should auto-advance it. */
import type { SessionState } from './state'

/** How long after endsAt a submitted question is still accepted, to absorb network latency. */
export const BURST_GRACE_MS = 2000

export function burstClosesAt(state: SessionState): number {
  return state.endsAt! + BURST_GRACE_MS
}

export function burstTimeoutMs(state: SessionState, now: number): number | null {
  if (state.phase !== 'burst') return null
  return Math.max(0, burstClosesAt(state) - now)
}
