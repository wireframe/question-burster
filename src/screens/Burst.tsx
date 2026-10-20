import { useState, type FormEvent } from 'react'
import { MAX_QUESTION_LENGTH, type ParticipantView } from '../../shared/protocol'
import { QuestionList } from '../components/QuestionList'
import { formatClock } from '../session/countdown'
import { AdvanceButton } from './AdvanceButton'
import type { PhaseScreenProps } from './types'

interface BurstProps extends PhaseScreenProps {
  secondsRemaining: number
  participantId: string | null
}

export function Burst({ view, send, secondsRemaining, participantId }: BurstProps) {
  return (
    <>
      <h1>{view.challenge}</h1>
      <Countdown secondsRemaining={secondsRemaining} />
      <QuestionForm send={send} timeIsUp={secondsRemaining === 0} />
      <QuestionList questions={view.myQuestions} label="Your questions" />
      {!isDone(view.participants, participantId) && <DoneButton send={send} />}
      <ParticipantProgress participants={view.participants} />
      <AdvanceButton phase="burst" send={send}>End burst</AdvanceButton>
    </>
  )
}

function isDone(participants: ParticipantView[], participantId: string | null): boolean {
  return participants.some((participant) => participant.id === participantId && participant.done)
}

function DoneButton({ send }: Pick<PhaseScreenProps, 'send'>) {
  return <button type="button" onClick={() => send({ type: 'markDone' })}>I'm done</button>
}

function Countdown({ secondsRemaining }: { secondsRemaining: number }) {
  return <p className="countdown">{secondsRemaining === 0 ? "Time's up" : formatClock(secondsRemaining)}</p>
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
    <form onSubmit={submit}>
      <label htmlFor="question-text">Your question</label>
      <input
        id="question-text"
        maxLength={MAX_QUESTION_LENGTH}
        disabled={timeIsUp}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </form>
  )
}

function ParticipantProgress({ participants }: { participants: ParticipantView[] }) {
  return (
    <ul aria-label="Participants">
      {participants.map((participant) => <li key={participant.id}>{progressLabel(participant)}</li>)}
    </ul>
  )
}

function progressLabel({ name, questionCount, done }: ParticipantView): string {
  return `${name} · ${questionCount}${done ? ' ✓' : ''}`
}
