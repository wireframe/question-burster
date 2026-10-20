import type { CommandContext } from './state'

export interface Clock {
  now: () => number
  newId: () => string
  random: () => number
}

export const systemClock: Clock = { now: () => Date.now(), newId: () => crypto.randomUUID(), random: Math.random }

export function contextFrom(clock: Clock): CommandContext {
  return { now: clock.now(), newId: clock.newId, random: clock.random }
}
