/** Turns authoritative session state into the view a given client may see. */
import type { ParticipantView, QuestionView, SessionView } from '../../shared/protocol'
import type { Participant, Question, SessionState } from './state'

export function projectForClient(state: SessionState, viewerId: string | null): SessionView {
  return {
    id: state.id,
    challenge: state.challenge,
    burstSeconds: state.burstSeconds,
    phase: state.phase,
    endsAt: state.endsAt,
    participants: projectParticipants(state),
    myQuestions: myQuestions(state, viewerId),
  }
}

function projectParticipants(state: SessionState): ParticipantView[] {
  const counts = questionCountsByAuthor(state)
  return Object.values(state.participants).map((participant) => projectParticipant(participant, counts))
}

function projectParticipant(participant: Participant, counts: Map<string, number>): ParticipantView {
  return {
    id: participant.id,
    name: participant.name,
    questionCount: counts.get(participant.id) ?? 0,
    done: participant.done,
  }
}

function questionCountsByAuthor(state: SessionState): Map<string, number> {
  const counts = new Map<string, number>()
  Object.values(state.questions).forEach(({ authorId }) => counts.set(authorId, (counts.get(authorId) ?? 0) + 1))
  return counts
}

function myQuestions(state: SessionState, viewerId: string | null): QuestionView[] {
  if (state.phase !== 'burst' || viewerId === null) return []
  return questionsBy(state, viewerId).map(toQuestionView)
}

function questionsBy(state: SessionState, authorId: string): Question[] {
  return Object.values(state.questions).filter((question) => question.authorId === authorId)
}

function toQuestionView(question: Question): QuestionView {
  return { id: question.id, text: question.text }
}
