import { MAX_LABEL_LENGTH } from '../../shared/protocol'
import type { GroupDraft } from '../session/state'
import type { QuestionText } from './group-questions'

const UNGROUPED_LABEL = 'Ungrouped'

export function normalizeGroups(drafts: GroupDraft[], questions: QuestionText[]): GroupDraft[] {
  const textById = new Map(questions.map((question) => [question.id, question.text]))
  const groups = keepFirstClaims(drafts, new Set(textById.keys()))
    .filter((group) => group.questionIds.length > 0)
    .map((group) => withLabel(group, textById))
  return appendUngrouped(groups, questions)
}

function keepFirstClaims(drafts: GroupDraft[], unclaimed: Set<string>): GroupDraft[] {
  return drafts.map((draft) => ({
    label: draft.label,
    questionIds: draft.questionIds.filter((id) => unclaimed.delete(id)),
  }))
}

function withLabel(group: GroupDraft, textById: Map<string, string>): GroupDraft {
  return { ...group, label: chooseLabel(group, textById).slice(0, MAX_LABEL_LENGTH) }
}

function chooseLabel(group: GroupDraft, textById: Map<string, string>): string {
  const firstQuestionText = textById.get(group.questionIds[0])!
  if (group.questionIds.length === 1) return firstQuestionText
  return group.label.trim() || firstQuestionText
}

function appendUngrouped(groups: GroupDraft[], questions: QuestionText[]): GroupDraft[] {
  const grouped = new Set(groups.flatMap((group) => group.questionIds))
  const missing = questions.filter((question) => !grouped.has(question.id)).map((question) => question.id)
  return missing.length > 0 ? [...groups, { label: UNGROUPED_LABEL, questionIds: missing }] : groups
}
