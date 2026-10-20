import type { SessionView } from '../shared/protocol'

export function buildView(overrides: Partial<SessionView> = {}): SessionView {
  return {
    id: 's1',
    challenge: 'Why?',
    burstSeconds: 240,
    phase: 'lobby',
    endsAt: null,
    participants: [],
    myQuestions: [],
    groupingStatus: 'idle',
    groups: [],
    ...overrides,
  }
}
