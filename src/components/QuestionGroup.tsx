import { useId, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react'
import { MAX_LABEL_LENGTH, type GroupView, type QuestionView } from '../../shared/protocol'
import type { PhaseScreenProps } from '../screens/types'

interface QuestionGroupProps extends Pick<PhaseScreenProps, 'send'> {
  group: GroupView
  otherGroups: GroupView[]
}

export function QuestionGroup({ group, otherGroups, send }: QuestionGroupProps) {
  return (
    <fieldset className="question-group" aria-label={group.label}>
      <LabelEditor group={group} send={send} />
      <GroupQuestions group={group} send={send} />
      <MergeSelect group={group} otherGroups={otherGroups} send={send} />
    </fieldset>
  )
}

type GroupActionProps = Omit<QuestionGroupProps, 'otherGroups'>

function LabelEditor({ group, send }: GroupActionProps) {
  const inputId = useId()

  function submitLabel(event: FocusEvent<HTMLInputElement>) {
    const label = event.target.value.trim()
    if (label === '') event.target.value = group.label
    else if (label !== group.label) send({ type: 'reword', groupId: group.id, label, baseVersion: group.version })
  }

  return (
    <>
      <label htmlFor={inputId}>Label</label>
      <input
        key={`${group.id}:${group.label}`}
        id={inputId}
        maxLength={MAX_LABEL_LENGTH}
        defaultValue={group.label}
        onBlur={submitLabel}
        onKeyDown={blurOnEnter}
      />
    </>
  )
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter') event.currentTarget.blur()
}

function GroupQuestions({ group, send }: GroupActionProps) {
  const splittable = group.questions.length > 1
  return (
    <ul>
      {group.questions.map((question) => (
        <li key={question.id}>
          {question.text}
          {splittable && <SplitButton groupId={group.id} question={question} send={send} />}
        </li>
      ))}
    </ul>
  )
}

interface SplitButtonProps extends Pick<PhaseScreenProps, 'send'> {
  groupId: string
  question: QuestionView
}

function SplitButton({ groupId, question, send }: SplitButtonProps) {
  return (
    <button type="button" onClick={() => send({ type: 'split', groupId, questionId: question.id })}>
      Split out
    </button>
  )
}

function MergeSelect({ group, otherGroups, send }: QuestionGroupProps) {
  function mergeIntoSelected(event: ChangeEvent<HTMLSelectElement>) {
    const targetGroupId = event.target.value
    if (targetGroupId) send({ type: 'merge', sourceGroupId: group.id, targetGroupId })
  }

  return (
    <select aria-label="Merge into…" value="" onChange={mergeIntoSelected}>
      <option value="">Merge into…</option>
      {otherGroups.map((other) => <option key={other.id} value={other.id}>{other.label}</option>)}
    </select>
  )
}
