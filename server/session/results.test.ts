import { describe, expect, it } from 'vitest'
import { rankResults } from './results'
import type { Group } from './state'
import { buildSession, expectNoKey } from './test-support'

const questions = {
  q1: { id: 'q1', authorId: 'p1', text: 'Why now?' },
  q2: { id: 'q2', authorId: 'p2', text: 'Why today?' },
  q3: { id: 'q3', authorId: 'p1', text: 'Who pays?' },
  q4: { id: 'q4', authorId: 'p2', text: 'How big?' },
}

function group(id: string, label: string, questionIds: string[]): Group {
  return { id, label, version: 0, questionIds }
}

const timing = group('g1', 'Timing', ['q1', 'q2'])
const money = group('g2', 'Money', ['q3'])
const scale = group('g3', 'Scale', ['q4'])

function rankedWith(votes: Record<string, Record<string, number>>) {
  return rankResults(buildSession({ phase: 'results', questions, groups: { g1: timing, g2: money, g3: scale }, votes }))
}

describe('rankResults', () => {
  it('describes each group with its questions and vote total', () => {
    const [first] = rankedWith({ p1: { g1: 1 } })

    expect(first).toEqual({
      groupId: 'g1',
      label: 'Timing',
      questions: [
        { id: 'q1', text: 'Why now?' },
        { id: 'q2', text: 'Why today?' },
      ],
      votes: 1,
      rank: 1,
    })
  })

  it('sums votes for a group across participants', () => {
    const [first] = rankedWith({ p1: { g2: 2 }, p2: { g2: 1, g1: 2 } })

    expect(first).toMatchObject({ groupId: 'g2', votes: 3 })
  })

  it('sorts by votes descending', () => {
    const ranked = rankedWith({ p1: { g3: 3 }, p2: { g2: 1, g1: 2 } })

    expect(ranked.map((result) => result.groupId)).toEqual(['g3', 'g1', 'g2'])
  })

  it('breaks vote ties by label ascending', () => {
    const ranked = rankedWith({ p1: { g1: 1, g2: 1, g3: 1 } })

    expect(ranked.map((result) => result.label)).toEqual(['Money', 'Scale', 'Timing'])
  })

  it('includes groups with zero votes', () => {
    const ranked = rankedWith({ p1: { g1: 1 } })

    expect(ranked.map((result) => [result.groupId, result.votes])).toEqual([
      ['g1', 1],
      ['g2', 0],
      ['g3', 0],
    ])
  })

  it('gives tied groups the same rank using competition ranking', () => {
    const ranked = rankedWith({ p1: { g1: 3 }, p2: { g1: 2, g3: 1 }, p3: { g2: 3 }, p4: { g2: 2, g3: 1 } })

    expect(ranked.map((result) => [result.votes, result.rank])).toEqual([
      [5, 1],
      [5, 1],
      [2, 3],
    ])
  })

  it('returns no results when there are no groups', () => {
    expect(rankResults(buildSession())).toEqual([])
  })

  it('omits private author data', () => {
    expectNoKey(rankedWith({}), 'authorId')
  })
})
