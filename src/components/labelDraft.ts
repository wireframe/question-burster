import { MAX_LABEL_LENGTH, type ClientCommand, type GroupView } from '../../shared/protocol'
import { pluralize } from '../screens/pluralize'

const HINT_THRESHOLD = 40

export interface LabelDraft {
  text: string
  startedFrom: string
}

export type SaveOutcome = { kind: 'send'; command: ClientCommand } | { kind: 'conflict' }

export function startDraft(group: GroupView): LabelDraft {
  return { text: group.label, startedFrom: group.label }
}

export function isSaveable(draft: LabelDraft): boolean {
  const label = draft.text.trim()
  return label !== '' && label !== draft.startedFrom
}

export function remoteLabel(draft: LabelDraft, group: GroupView): string | null {
  return group.label === draft.startedFrom ? null : group.label
}

export function saveOutcome(draft: LabelDraft, group: GroupView): SaveOutcome {
  if (remoteLabel(draft, group) !== null) return { kind: 'conflict' }
  return { kind: 'send', command: rewordCommand(draft, group) }
}

export function rewordCommand(draft: LabelDraft, group: GroupView): ClientCommand {
  return { type: 'reword', groupId: group.id, label: draft.text.trim(), baseVersion: group.version }
}

export function charactersLeftHint(text: string): string | null {
  const left = MAX_LABEL_LENGTH - text.length
  return left <= HINT_THRESHOLD ? `${pluralize(left, 'character')} left` : null
}
