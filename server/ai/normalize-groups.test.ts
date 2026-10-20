import { describe, expect, it } from 'vitest'
import { MAX_LABEL_LENGTH } from '../../shared/protocol'
import { normalizeGroups } from './normalize-groups'

const questions = [
  { id: 'q1', text: 'Why now?' },
  { id: 'q2', text: 'Who decides?' },
  { id: 'q3', text: 'What if we wait?' },
]

describe('normalizeGroups', () => {
  it('keeps well-formed multi-question groups as they are', () => {
    const drafts = [
      { label: 'Timing', questionIds: ['q1', 'q3'] },
      { label: 'Ownership', questionIds: ['q2', 'q4'] },
    ]
    const fourQuestions = [...questions, { id: 'q4', text: 'Who signs off?' }]

    expect(normalizeGroups(drafts, fourQuestions)).toEqual(drafts)
  })

  it("labels a single-question group with that question's own text", () => {
    const drafts = [
      { label: 'How do we price the product?', questionIds: ['q2'] },
      { label: 'Timing', questionIds: ['q1', 'q3'] },
    ]

    expect(normalizeGroups(drafts, questions)).toEqual([
      { label: 'Who decides?', questionIds: ['q2'] },
      { label: 'Timing', questionIds: ['q1', 'q3'] },
    ])
  })

  it('labels a group left with one surviving question by that question text', () => {
    const drafts = [{ label: 'Pricing', questionIds: ['ghost', 'q3'] }]

    expect(normalizeGroups(drafts, questions)[0]).toEqual({ label: 'What if we wait?', questionIds: ['q3'] })
  })

  it('caps a single-question label at the maximum label length', () => {
    const longText = 'y'.repeat(MAX_LABEL_LENGTH + 5)
    const drafts = [{ label: 'Long', questionIds: ['long'] }]

    expect(normalizeGroups(drafts, [{ id: 'long', text: longText }])[0].label).toBe('y'.repeat(MAX_LABEL_LENGTH))
  })

  it('drops unknown ids', () => {
    const drafts = [{ label: 'All', questionIds: ['q1', 'nope', 'q2', 'q3'] }]

    expect(normalizeGroups(drafts, questions)).toEqual([{ label: 'All', questionIds: ['q1', 'q2', 'q3'] }])
  })

  it('keeps an id repeated across groups only in the first', () => {
    const drafts = [
      { label: 'A', questionIds: ['q1', 'q2'] },
      { label: 'B', questionIds: ['q2', 'q3'] },
    ]

    expect(normalizeGroups(drafts, questions)).toEqual([
      { label: 'A', questionIds: ['q1', 'q2'] },
      { label: 'What if we wait?', questionIds: ['q3'] },
    ])
  })

  it('drops groups left empty', () => {
    const drafts = [
      { label: 'A', questionIds: ['q1', 'q2', 'q3'] },
      { label: 'Dupes', questionIds: ['q1', 'ghost'] },
    ]

    expect(normalizeGroups(drafts, questions)).toEqual([{ label: 'A', questionIds: ['q1', 'q2', 'q3'] }])
  })

  it('puts missing ids in a final Ungrouped group, in question order', () => {
    const drafts = [{ label: 'Ownership', questionIds: ['q2'] }]

    expect(normalizeGroups(drafts, questions)).toEqual([
      { label: 'Who decides?', questionIds: ['q2'] },
      { label: 'Ungrouped', questionIds: ['q1', 'q3'] },
    ])
  })

  it('trims labels', () => {
    const drafts = [{ label: '  Everything  ', questionIds: ['q1', 'q2', 'q3'] }]

    expect(normalizeGroups(drafts, questions)).toEqual([{ label: 'Everything', questionIds: ['q1', 'q2', 'q3'] }])
  })

  it('falls back to the first question text for a blank label', () => {
    const drafts = [{ label: '   ', questionIds: ['q3', 'q1', 'q2'] }]

    expect(normalizeGroups(drafts, questions)).toEqual([
      { label: 'What if we wait?', questionIds: ['q3', 'q1', 'q2'] },
    ])
  })

  it('uses the first surviving question for the fallback label', () => {
    const drafts = [{ label: '', questionIds: ['ghost', 'q2', 'q1', 'q3'] }]

    expect(normalizeGroups(drafts, questions)[0].label).toBe('Who decides?')
  })

  it('truncates a label longer than the maximum label length', () => {
    const longLabel = 'x'.repeat(MAX_LABEL_LENGTH) + 'overflow'
    const drafts = [{ label: longLabel, questionIds: ['q1', 'q2', 'q3'] }]

    expect(normalizeGroups(drafts, questions)[0].label).toBe('x'.repeat(MAX_LABEL_LENGTH))
  })
})
