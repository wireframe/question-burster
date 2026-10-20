import { describe, expect, it } from 'vitest'
import { PHASE_ORDER, VOTES_PER_PERSON } from '../../shared/protocol'
import { STEPS, stepFor, stepStatus } from './steps'

describe('STEPS', () => {
  it('has one numbered step per phase in phase order', () => {
    expect(STEPS.map((step) => step.phase)).toEqual([...PHASE_ORDER])
    expect(STEPS.map((step) => step.number)).toEqual([1, 2, 3, 4, 5])
  })

  it('labels each step', () => {
    expect(STEPS.map((step) => step.label)).toEqual(['Join', 'Burst', 'Consolidate', 'Vote', 'Results'])
  })

  it('tells voters how many votes they have', () => {
    expect(stepFor('vote').hint).toBe(
      `You have ${VOTES_PER_PERSON} votes. Put them on the questions that matter most — stack them if you feel strongly.`,
    )
  })

  it('names the action that moves each step on, with none after results', () => {
    expect(STEPS.map((step) => step.advanceLabel)).toEqual(['Start burst', 'End burst', 'Start voting', 'Show results', null])
  })

  it('tells bursters to write only questions', () => {
    expect(stepFor('burst').hint).toBe(
      'Write as many questions as you can. No answers, no explanations — just questions.',
    )
  })
})

describe('stepStatus', () => {
  it.each([
    ['lobby', 'done'],
    ['consolidate', 'current'],
    ['results', 'upcoming'],
  ] as const)('marks the %s step as %s during consolidation', (phase, status) => {
    expect(stepStatus(stepFor(phase), 'consolidate')).toBe(status)
  })
})
