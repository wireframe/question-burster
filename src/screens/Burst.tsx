import { useState, type FormEvent } from 'react'
import { MAX_QUESTION_LENGTH, type ParticipantView } from '../../shared/protocol'
import { GuidePanel } from '../components/GuidePanel'
import { QuestionList } from '../components/QuestionList'
import { actionBar, card, fieldLabel, secondaryButton, sectionTitle, textField } from '../components/ui'
import { QUESTION_GOAL } from '../session/steps'
import type { PhaseScreenProps } from './types'

const QUESTION_TIPS = [
  'Short, open and simple beats long, closed and complex.',
  'Start by describing (What’s working? What’s not? Why?), then speculate (What if? Why not?).',
  'Surprising and provocative questions are welcome.',
  'Just the question: no lead-in explaining why you’re asking.',
]

interface BurstProps extends PhaseScreenProps {
  secondsRemaining: number
  participantId: string | null
}

export function Burst({ view, send, secondsRemaining, participantId }: BurstProps) {
  return (
    <div className="space-y-6">
      <QuestionForm send={send} timeIsUp={secondsRemaining === 0} />
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={sectionTitle}>Your questions</h2>
          <p className="text-sm text-ink-muted tabular-nums">{goalProgress(view.myQuestions.length)}</p>
        </div>
        <QuestionList questions={view.myQuestions} label="Your questions" />
      </section>
      {!isDone(view.participants, participantId) && <DoneButton send={send} />}
    </div>
  )
}

function goalProgress(count: number): string {
  return count >= QUESTION_GOAL ? `${count} · goal reached` : `${count} of ${QUESTION_GOAL}`
}

function isDone(participants: ParticipantView[], participantId: string | null): boolean {
  return participants.some((participant) => participant.id === participantId && participant.done)
}

function DoneButton({ send }: Pick<PhaseScreenProps, 'send'>) {
  return (
    <div className={actionBar}>
      <button type="button" className={secondaryButton} onClick={() => send({ type: 'markDone' })}>I'm done</button>
    </div>
  )
}

function QuestionForm({ send, timeIsUp }: Pick<PhaseScreenProps, 'send'> & { timeIsUp: boolean }) {
  const [text, setText] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (text.trim() === '') return
    send({ type: 'submitQuestion', text })
    setText('')
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-2`}>
      <label htmlFor="question-text" className={fieldLabel}>Your question</label>
      <input
        id="question-text"
        aria-describedby="question-text-hint"
        autoComplete="off"
        maxLength={MAX_QUESTION_LENGTH}
        disabled={timeIsUp}
        placeholder="Why…? What if…? How might…?"
        className={`${textField} text-lg`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p id="question-text-hint" className="text-xs text-ink-muted">{submitHint(text)}</p>
      <GuidePanel title="What makes a good question?" tips={QUESTION_TIPS} />
    </form>
  )
}

function submitHint(text: string): string {
  const lacksQuestionMark = text.trim() !== '' && !text.trim().endsWith('?')
  return lacksQuestionMark ? 'Questions end with a “?”. Press Enter to add it anyway.' : 'Press Enter to add it to the wall.'
}
