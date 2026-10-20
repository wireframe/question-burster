import type { QuestionView } from '../../shared/protocol'
import type { Group, Question, SessionState } from './state'

export function toQuestionView(question: Question, state: SessionState): QuestionView {
  return { id: question.id, text: question.text, color: state.participants[question.authorId].colorIndex }
}

export function groupQuestionViews(group: Group, state: SessionState): QuestionView[] {
  return group.questionIds.map((questionId) => toQuestionView(state.questions[questionId], state))
}
