import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { MAX_LABEL_LENGTH, type ClientCommand, type GroupView, type QuestionView } from '../../shared/protocol'
import type { PhaseScreenProps } from '../screens/types'
import { stickyNoteClasses } from './stickyNote'
import { charactersLeftHint, isSaveable, remoteLabel, rewordCommand, saveOutcome, startDraft, type LabelDraft } from './labelDraft'
import { card, compactPrimaryButton, ghostButton, secondaryButton } from './ui'

interface QuestionGroupProps extends Pick<PhaseScreenProps, 'send'> {
  group: GroupView
  otherGroups: GroupView[]
}

export function QuestionGroup({ group, otherGroups, send }: QuestionGroupProps) {
  return (
    <div role="group" className={`${card} min-w-0 space-y-4`} aria-label={group.label}>
      <GroupHeading group={group} send={send} />
      <GroupQuestions group={group} send={send} />
      <MergeSelect group={group} otherGroups={otherGroups} send={send} />
    </div>
  )
}

type GroupActionProps = Omit<QuestionGroupProps, 'otherGroups'>

function GroupHeading({ group, send }: GroupActionProps) {
  const [draft, setDraft] = useState<LabelDraft | null>(null)
  if (draft === null) return <LabelView label={group.label} onEdit={() => setDraft(startDraft(group))} />
  return <LabelEditor group={group} draft={draft} onDraftChange={setDraft} onClose={() => setDraft(null)} send={send} />
}

function LabelView({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <h2 className="min-w-0 text-lg leading-snug font-semibold break-words text-ink">{label}</h2>
      <button type="button" aria-label={`Edit question: ${label}`} className={`${ghostButton} shrink-0 gap-1 text-xs`} onClick={onEdit}>
        <PencilIcon />
        Edit
      </button>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" />
    </svg>
  )
}

interface LabelEditorProps extends GroupActionProps {
  draft: LabelDraft
  onDraftChange: (draft: LabelDraft) => void
  onClose: () => void
}

function LabelEditor({ group, draft, onDraftChange, onClose, send }: LabelEditorProps) {
  const { confirmingReplace, save, replaceWithMine } = useLabelSave({ group, draft, onClose, send })
  const theirs = remoteLabel(draft, group)
  return (
    <div className="space-y-2">
      <DraftField draft={draft} onDraftChange={onDraftChange} onSave={save} onCancel={onClose} />
      {theirs !== null && <p className="text-sm text-ink-muted">Someone else updated this question to "{theirs}".</p>}
      {confirmingReplace
        ? <ConflictChoices onUseTheirs={onClose} onReplaceWithMine={replaceWithMine} />
        : <EditActions saveable={isSaveable(draft)} onSave={save} onCancel={onClose} />}
    </div>
  )
}

function useLabelSave({ group, draft, onClose, send }: Omit<LabelEditorProps, 'onDraftChange'>) {
  const [confirmingReplace, setConfirmingReplace] = useState(false)

  function sendAndClose(command: ClientCommand) {
    send(command)
    onClose()
  }

  function save() {
    const outcome = saveOutcome(draft, group)
    if (outcome.kind === 'conflict') setConfirmingReplace(true)
    else sendAndClose(outcome.command)
  }

  return { confirmingReplace, save, replaceWithMine: () => sendAndClose(rewordCommand(draft, group)) }
}

interface DraftFieldProps {
  draft: LabelDraft
  onDraftChange: (draft: LabelDraft) => void
  onSave: () => void
  onCancel: () => void
}

function DraftField({ draft, onDraftChange, onSave, onCancel }: DraftFieldProps) {
  const inputId = useId()
  const ref = useFocusAtEnd()
  const hint = charactersLeftHint(draft.text)

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') onCancel()
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (isSaveable(draft)) onSave()
  }

  return (
    <>
      <label htmlFor={inputId} className="sr-only">Question wording</label>
      <textarea
        ref={ref}
        id={inputId}
        rows={1}
        className="block w-full resize-none field-sizing-content rounded-lg border border-accent bg-surface px-2 py-1 text-lg leading-snug font-semibold break-words text-ink focus-visible:outline-2 focus-visible:outline-accent"
        maxLength={MAX_LABEL_LENGTH}
        value={draft.text}
        onChange={(event) => onDraftChange({ ...draft, text: event.target.value })}
        onKeyDown={handleKey}
      />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </>
  )
}

function useFocusAtEnd() {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const field = ref.current!
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
  }, [])
  return ref
}

function EditActions({ saveable, onSave, onCancel }: { saveable: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={compactPrimaryButton} disabled={!saveable} onClick={onSave}>Save</button>
      <button type="button" className={ghostButton} onClick={onCancel}>Cancel</button>
    </div>
  )
}

function ConflictChoices({ onUseTheirs, onReplaceWithMine }: { onUseTheirs: () => void; onReplaceWithMine: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={secondaryButton} onClick={onUseTheirs}>Use theirs</button>
      <button type="button" className={ghostButton} onClick={onReplaceWithMine}>Replace with mine</button>
    </div>
  )
}

function GroupQuestions({ group, send }: GroupActionProps) {
  const splittable = group.questions.length > 1
  return (
    <ul className="space-y-2">
      {group.questions.map((question, index) => (
        <li key={question.id} className={`${stickyNoteClasses(question.color, index)} flex w-full items-start justify-between gap-2 px-3 py-2 text-sm`}>
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
