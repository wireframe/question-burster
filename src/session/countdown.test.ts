import { describe, expect, it } from 'vitest'
import { countdownUrgency, formatClock, secondsRemaining } from './countdown'

describe('secondsRemaining', () => {
  it('rounds the time left on the server clock up to whole seconds', () => {
    expect(secondsRemaining({ endsAt: 10_000, clockOffset: 500, now: 7_000 })).toBe(3)
  })

  it('never goes below zero', () => {
    expect(secondsRemaining({ endsAt: 10_000, clockOffset: 0, now: 12_000 })).toBe(0)
  })
})

describe('formatClock', () => {
  it.each([
    [125, '2:05'],
    [59, '0:59'],
    [0, '0:00'],
  ])('formats %i seconds as %s', (seconds, clock) => {
    expect(formatClock(seconds)).toBe(clock)
  })
})

describe('countdownUrgency', () => {
  it.each([
    [125, 'calm'],
    [30, 'calm'],
    [29, 'warning'],
    [10, 'warning'],
    [9, 'critical'],
    [0, 'critical'],
  ] as const)('treats %i seconds left as %s', (seconds, urgency) => {
    expect(countdownUrgency(seconds)).toBe(urgency)
  })
})
