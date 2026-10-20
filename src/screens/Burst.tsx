import { useState, type FormEvent } from 'react'
import { MAX_QUESTION_LENGTH, type ParticipantView } from '../../shared/protocol'
import { QuestionList } from '../components/QuestionList'
import { actionBar, card, fieldLabel, secondaryButton, sectionTitle, textField } from '../components/ui'
import type { PhaseScreenProps } from './types'

interface BurstProps extends PhaseScreenProps {
  secondsRemaining: number
  participantId: string | null
}

export function Burst({ view, send, secondsRemaining, participantId }: BurstProps) {
  return (
    <div className="space-y-6">
      <QuestionForm send={send} timeIsUp={secondsRemaining === 0} />
      <section className="space-y-3">
        <h2 className={sectionTitle}>Your questions</h2>
        <QuestionList questions={view.myQuestions} label="Your questions" />
      </section>
      {!isDone(view.participants, participantId) && <DoneButton send={send} />}
    </div>
  )
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
      <p id="question-text-hint" className="text-xs text-ink-muted">Press Enter to add it to the wall.</p>
    </form>
  )
}
