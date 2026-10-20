import { useId, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react'
import { MAX_LABEL_LENGTH, type GroupView, type QuestionView } from '../../shared/protocol'
import type { PhaseScreenProps } from '../screens/types'
import { stickyNoteClasses } from './stickyNote'
import { card, ghostButton } from './ui'

interface QuestionGroupProps extends Pick<PhaseScreenProps, 'send'> {
  group: GroupView
  otherGroups: GroupView[]
}

export function QuestionGroup({ group, otherGroups, send }: QuestionGroupProps) {
  return (
    <div role="group" className={`${card} min-w-0 space-y-4`} aria-label={group.label}>
      <LabelEditor group={group} send={send} />
      <GroupQuestions group={group} send={send} />
      <MergeSelect group={group} otherGroups={otherGroups} send={send} />
    </div>
  )
}

type GroupActionProps = Omit<QuestionGroupProps, 'otherGroups'>

function LabelEditor({ group, send }: GroupActionProps) {
  const inputId = useId()

  function submitLabel(event: FocusEvent<HTMLTextAreaElement>) {
    const label = event.target.value.trim()
    if (label === '') event.target.value = group.label
    else if (label !== group.label) send({ type: 'reword', groupId: group.id, label, baseVersion: group.version })
  }

  return (
    <>
      <label htmlFor={inputId} className="sr-only">Label</label>
      <textarea
        key={`${group.id}:${group.label}`}
        id={inputId}
        rows={1}
        className="-mx-2 block w-[calc(100%+1rem)] resize-none field-sizing-content rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg leading-snug font-semibold break-words text-ink hover:border-line focus:border-accent focus:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        maxLength={MAX_LABEL_LENGTH}
        defaultValue={group.label}
        onBlur={submitLabel}
        onKeyDown={commitOnEnter}
      />
    </>
  )
}

function commitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  event.currentTarget.blur()
}

function GroupQuestions({ group, send }: GroupActionProps) {
  const splittable = group.questions.length > 1
  return (
    <ul className="space-y-2">
      {group.questions.map((question, index) => (
        <li key={question.id} className={`${stickyNoteClasses(index)} flex w-full items-start justify-between gap-2 px-3 py-2 text-sm`}>
          <span className="min-w-0 flex-1 pt-1">{question.text}</span>
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
    <button type="button" className={`${ghostButton} shrink-0 bg-surface/60 text-xs`} onClick={() => send({ type: 'split', groupId, questionId: question.id })}>
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
    <select
      aria-label="Merge into…"
      value=""
      className="block w-full min-w-0 truncate rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      onChange={mergeIntoSelected}
    >
      <option value="">Merge into…</option>
      {otherGroups.map((other) => <option key={other.id} value={other.id}>{other.label}</option>)}
    </select>
  )
}
