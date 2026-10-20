import { describe, expect, it } from 'vitest'
import { projectForClient } from './projection'
import type { SessionState } from './state'
import { buildSession, expectNoKey } from './test-support'

function sessionWithQuestionsFromBoth(overrides: Partial<SessionState> = {}): SessionState {
  return {
    ...sessionWithTwoParticipants(),
    questions: {
      q1: { id: 'q1', authorId: 'p1', text: 'Ada asks one' },
      q2: { id: 'q2', authorId: 'p2', text: 'Grace secret' },
      q3: { id: 'q3', authorId: 'p1', text: 'Ada asks two' },
    },
    ...overrides,
  }
}

function sessionWithTwoParticipants(): SessionState {
  return buildSession({
    phase: 'burst',
    endsAt: 5_000,
    participants: {
      p1: { id: 'p1', resumeToken: 't1', name: 'Ada', done: false },
      p2: { id: 'p2', resumeToken: 't2', name: 'Grace', done: true },
    },
  })
}

describe('projectForClient', () => {
  it('projects session fields and participants for a participant viewer', () => {
    const view = projectForClient(sessionWithTwoParticipants(), 'p1')

    expect(view).toEqual({
      id: 's1',
      challenge: 'Why?',
      burstSeconds: 240,
      phase: 'burst',
      endsAt: 5_000,
      participants: [
        { id: 'p1', name: 'Ada', questionCount: 0, done: false },
        { id: 'p2', name: 'Grace', questionCount: 0, done: true },
      ],
      myQuestions: [],
      groupingStatus: 'idle',
      groups: [],
    })
  })

  it('works for a spectator with no viewer id', () => {
    const view = projectForClient(sessionWithTwoParticipants(), null)

    expect(view.participants.map((participant) => participant.id)).toEqual(['p1', 'p2'])
  })

  it('never exposes authorId', () => {
    expectNoKey(projectForClient(sessionWithTwoParticipants(), null), 'authorId')
  })

  it('never exposes resumeToken, even to the participant it belongs to', () => {
    expectNoKey(projectForClient(sessionWithTwoParticipants(), 'p1'), 'resumeToken')
  })

  describe('burst privacy', () => {
    it('shows a participant only their own questions', () => {
      const view = projectForClient(sessionWithQuestionsFromBoth(), 'p1')

      expect(view.myQuestions).toEqual([
        { id: 'q1', text: 'Ada asks one' },
        { id: 'q3', text: 'Ada asks two' },
      ])
    })

    it('counts every participant\'s questions', () => {
      const view = projectForClient(sessionWithQuestionsFromBoth(), 'p1')

      expect(view.participants.map((participant) => participant.questionCount)).toEqual([2, 1])
    })

    it('never leaks another participant\'s question text', () => {
      const view = projectForClient(sessionWithQuestionsFromBoth(), 'p1')

      expect(JSON.stringify(view)).not.toContain('Grace secret')
    })

    it('never exposes authorId when questions exist', () => {
      expectNoKey(projectForClient(sessionWithQuestionsFromBoth(), 'p1'), 'authorId')
    })

    it('gives a spectator no questions', () => {
      expect(projectForClient(sessionWithQuestionsFromBoth(), null).myQuestions).toEqual([])
    })

    it('fills myQuestions only during the burst but keeps counts afterwards', () => {
      const view = projectForClient(sessionWithQuestionsFromBoth({ phase: 'consolidate' }), 'p1')

      expect(view.myQuestions).toEqual([])
      expect(view.participants.map((participant) => participant.questionCount)).toEqual([2, 1])
    })
  })

  describe('consolidation', () => {
    function consolidatingSession(): SessionState {
      return sessionWithQuestionsFromBoth({
        phase: 'consolidate',
        groupingStatus: 'ready',
        groups: {
          g1: { id: 'g1', label: 'Zebra concerns', version: 2, questionIds: ['q3', 'q1'] },
          g2: { id: 'g2', label: 'Apple worries', version: 1, questionIds: ['q2'] },
        },
      })
    }

    it('passes groupingStatus through', () => {
      expect(projectForClient(consolidatingSession(), 'p1').groupingStatus).toBe('ready')
    })

    it('projects groups sorted by label with questions in group order', () => {
      const view = projectForClient(consolidatingSession(), 'p1')

      expect(view.groups).toEqual([
        { id: 'g2', label: 'Apple worries', version: 1, questions: [{ id: 'q2', text: 'Grace secret' }] },
        {
          id: 'g1',
          label: 'Zebra concerns',
          version: 2,
          questions: [
            { id: 'q3', text: 'Ada asks two' },
            { id: 'q1', text: 'Ada asks one' },
          ],
        },
      ])
    })

    it('never exposes authorId in groups', () => {
      expectNoKey(projectForClient(consolidatingSession(), 'p1'), 'authorId')
    })

    it('leaves myQuestions empty outside the burst', () => {
      expect(projectForClient(consolidatingSession(), 'p1').myQuestions).toEqual([])
    })
  })
})
