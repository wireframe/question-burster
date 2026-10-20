import type { ReactNode } from 'react'
import { VOTES_PER_PERSON, type SessionView } from '../../shared/protocol'
import type { PhaseScreenProps } from '../screens/types'
import { pluralize } from '../screens/pluralize'
import { countdownUrgency, formatClock, type CountdownUrgency } from '../session/countdown'
import { stepFor } from '../session/steps'
import { LogoMark } from './LogoMark'
import { ParticipantAvatars } from './ParticipantAvatars'
import { compactPrimaryButton, pageColumn } from './ui'
import { VoteDots } from './VoteDots'
import { WorkflowStepper } from './WorkflowStepper'

type Send = PhaseScreenProps['send']

export interface SessionHeaderProps {
  view: SessionView
  secondsRemaining: number
  send: Send | null
  participantId: string | null
}

export function SessionHeader(props: SessionHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 pt-3 pb-3 shadow-[0_8px_16px_-12px_rgb(31_36_48/0.25)] backdrop-blur-md sm:pt-5 sm:pb-4">
      <div className={`${pageColumn} space-y-3`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <ChallengeTitle challenge={props.view.challenge} />
          <ParticipantAvatars participants={props.view.participants} viewerId={props.participantId} />
        </div>
        <WorkflowStepper phase={props.view.phase}>
          {phaseStatus(props)}
          {props.send && <NextStepButton view={props.view} send={props.send} />}
        </WorkflowStepper>
      </div>
    </header>
  )
}

function ChallengeTitle({ challenge }: { challenge: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <a href="/" aria-label="Question Burst home" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <LogoMark />
      </a>
      <div className="min-w-0">
        <p className="font-marker text-lg leading-none text-accent">The challenge</p>
        <h1 className="mt-0.5 line-clamp-2 text-lg leading-snug font-semibold text-balance break-words sm:line-clamp-none sm:text-2xl">{challenge}</h1>
      </div>
    </div>
  )
}

function phaseStatus({ view, secondsRemaining }: SessionHeaderProps): ReactNode {
  switch (view.phase) {
    case 'burst':
      return <Countdown secondsRemaining={secondsRemaining} />
    case 'vote':
      return <VoteTally view={view} />
    default:
      return null
  }
}

const URGENCY_STYLES: Record<CountdownUrgency, string> = {
  calm: 'bg-surface text-ink border-line',
  warning: 'bg-warning-soft text-warning border-warning/40',
  critical: 'bg-danger-soft text-danger border-danger/40',
}

function Countdown({ secondsRemaining }: { secondsRemaining: number }) {
  return (
    <p role="timer" className={`rounded-full border-2 px-3 py-0.5 text-lg font-bold tabular-nums transition-colors ${URGENCY_STYLES[countdownUrgency(secondsRemaining)]}`}>
      {secondsRemaining === 0 ? "Time's up" : formatClock(secondsRemaining)}
    </p>
  )
}

function VoteTally({ view }: { view: SessionView }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold">
      <VoteDots filled={view.votesRemaining} total={VOTES_PER_PERSON} />
      <span>{pluralize(view.votesRemaining, 'vote')} left</span>
    </span>
  )
}

function NextStepButton({ view, send }: { view: SessionView; send: Send }) {
  const label = stepFor(view.phase).advanceLabel
  if (!label) return null
  return (
    <button type="button" className={`${compactPrimaryButton} ml-auto shrink-0`} disabled={isAwaitingGrouping(view)}
      onClick={() => send({ type: 'advance', fromPhase: view.phase })}>
      {label}<span aria-hidden="true">→</span>
    </button>
  )
}

function isAwaitingGrouping(view: SessionView): boolean {
  return view.phase === 'consolidate' && view.groupingStatus === 'pending'
}
