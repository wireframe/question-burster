/** Time and id generation, injected so session code stays deterministic under test. */
import type { CommandContext } from './state'

export interface Clock {
  now: () => number
  newId: () => string
}

export const systemClock: Clock = { now: () => Date.now(), newId: () => crypto.randomUUID() }

export function contextFrom(clock: Clock): CommandContext {
  return { now: clock.now(), newId: clock.newId }
}
