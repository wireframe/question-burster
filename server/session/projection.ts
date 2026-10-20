import {
  VOTES_PER_PERSON,
  type GroupView,
  type ParticipantView,
  type QuestionView,
  type ResultView,
  type SessionView,
} from '../../shared/protocol'
import { groupQuestionViews, toQuestionView } from './question-views'
import { rankResults } from './results'
import type { Group, Participant, Question, SessionState } from './state'
import { votesUsedBy } from './votes'

export function projectForClient(state: SessionState, viewerId: string | null): SessionView {
  return {
    id: state.id,
    challenge: state.challenge,
    burstSeconds: state.burstSeconds,
    phase: state.phase,
    endsAt: state.endsAt,
    participants: projectParticipants(state),
    myQuestions: myQuestions(state, viewerId),
    groupingStatus: state.groupingStatus,
    groups: projectGroups(state),
    myVotes: myVotes(state, viewerId),
    votesRemaining: votesRemaining(state, viewerId),
    results: projectResults(state),
  }
}

function projectParticipants(state: SessionState): ParticipantView[] {
  return Object.values(state.participants).map((participant) => ({
    id: participant.id,
    name: participant.name,
    done: hasCompletedStep(state, participant),
  }))
}

function hasCompletedStep(state: SessionState, participant: Participant): boolean {
  switch (state.phase) {
    case 'burst':
      return participant.done
    case 'vote':
      return votesUsedBy(state, participant.id) === VOTES_PER_PERSON
    default:
      return false
  }
}

function myQuestions(state: SessionState, viewerId: string | null): QuestionView[] {
  if (state.phase !== 'burst' || viewerId === null) return []
  return questionsBy(state, viewerId).map((question) => toQuestionView(question, state))
}

function questionsBy(state: SessionState, authorId: string): Question[] {
  return Object.values(state.questions).filter((question) => question.authorId === authorId)
}

function projectGroups(state: SessionState): GroupView[] {
  return Object.values(state.groups)
    .map((group) => projectGroup(group, state))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function projectGroup(group: Group, state: SessionState): GroupView {
  return {
    id: group.id,
    label: group.label,
    version: group.version,
    questions: groupQuestionViews(group, state),
  }
}

function myVotes(state: SessionState, viewerId: string | null): Record<string, number> {
  if (viewerId === null) return {}
  return Object.fromEntries(Object.entries(state.votes[viewerId] ?? {}).filter(([, count]) => count > 0))
}

function votesRemaining(state: SessionState, viewerId: string | null): number {
  if (viewerId === null) return 0
  return VOTES_PER_PERSON - votesUsedBy(state, viewerId)
}

function projectResults(state: SessionState): ResultView[] | null {
  return state.phase === 'results' ? rankResults(state) : null
}
