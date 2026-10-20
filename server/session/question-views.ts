import type { QuestionView } from '../../shared/protocol'
import type { Group, Question, SessionState } from './state'

export function toQuestionView(question: Question): QuestionView {
  return { id: question.id, text: question.text }
}

export function groupQuestionViews(group: Group, state: SessionState): QuestionView[] {
  return group.questionIds.map((questionId) => toQuestionView(state.questions[questionId]))
}
