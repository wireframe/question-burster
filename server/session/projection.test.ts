import { describe, expect, it } from 'vitest'
import { projectForClient } from './projection'
import type { SessionState } from './state'
import { buildSession, expectNoKey } from './test-support'

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
})
