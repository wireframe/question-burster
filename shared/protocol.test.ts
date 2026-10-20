import { describe, expect, it } from 'vitest'
import { isFinalPhase, nextPhase } from './protocol'

describe('nextPhase', () => {
  it('returns the phase that follows', () => {
    expect(nextPhase('lobby')).toBe('burst')
  })

  it('returns undefined after the final phase', () => {
    expect(nextPhase('results')).toBeUndefined()
  })
})

describe('isFinalPhase', () => {
  it.each([
    ['vote', false],
    ['results', true],
  ] as const)('reports %s as final: %s', (phase, final) => {
    expect(isFinalPhase(phase)).toBe(final)
  })
})
