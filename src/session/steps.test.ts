import { describe, expect, it } from 'vitest'
import { PHASE_ORDER, VOTES_PER_PERSON } from '../../shared/protocol'
import { QUESTION_GOAL, STEPS, stepFor, stepStatus } from './steps'

describe('STEPS', () => {
  it('has one numbered step per phase in phase order', () => {
    expect(STEPS.map((step) => step.phase)).toEqual([...PHASE_ORDER])
    expect(STEPS.map((step) => step.number)).toEqual([1, 2, 3, 4, 5])
  })

  it('labels each step', () => {
    expect(STEPS.map((step) => step.label)).toEqual(['Join', 'Burst', 'Consolidate', 'Vote', 'Results'])
  })

  it('asks the challenge owner to talk the challenge through before the burst', () => {
    expect(stepFor('lobby').hint).toBe(
      "Once everyone's here, have the challenge owner talk it through for two minutes, then start the burst.",
    )
  })

  it('asks consolidators to keep the askers\' words and the odd questions', () => {
    expect(stepFor('consolidate').hint).toBe(
      "Merge questions that ask the same thing and split ones that don't. Keep the asker's words where you can, and leave the odd ones standing.",
    )
  })

  it('tells voters how many votes they have and which questions deserve them', () => {
    expect(stepFor('vote').hint).toBe(
      `You have ${VOTES_PER_PERSON} votes. Put them on questions that open a new path, differ from how you've been approaching it, or make you a little uncomfortable. Stack them if you feel strongly.`,
    )
  })

  it('asks the group to commit to acting on a question', () => {
    expect(stepFor('results').hint).toBe(
      "These are the questions the group thinks matter most. Pick one and decide what you'll do about it in the next three weeks.",
    )
  })

  it('names the action that moves each step on, with none after results', () => {
    expect(STEPS.map((step) => step.advanceLabel)).toEqual(['Start burst', 'End burst', 'Start voting', 'Show results', null])
  })

  it('tells bursters to write only questions and aim for the goal', () => {
    expect(stepFor('burst').hint).toBe(
      `Write as many questions as you can, at least ${QUESTION_GOAL}. No answers, no explanations — just questions.`,
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
