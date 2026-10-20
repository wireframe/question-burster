import { isFinalPhase, type SessionView } from '../../shared/protocol'
import { RejectionNotice } from '../components/RejectionNotice'
import { WorkflowStepper } from '../components/WorkflowStepper'
import { useCountdown } from '../session/useCountdown'
import { useSession, type Session } from '../session/useSession'
import { Burst } from './Burst'
import { Consolidate } from './Consolidate'
import { JoinSession } from './JoinSession'
import { Lobby } from './Lobby'
import { Results } from './Results'
import { Vote } from './Vote'

export function SessionScreen({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId)
  return (
    <>
      {session.lastRejection && <RejectionNotice message={session.lastRejection} onDismiss={session.dismissRejection} />}
      <SessionBody session={session} />
    </>
  )
}

function needsToJoin(participantId: string | null, view: SessionView): boolean {
  return participantId == null && !isFinalPhase(view.phase)
}

function SessionBody({ session }: { session: Session }) {
  const { view } = session
  if (!view) return <StatusMessage>Connecting…</StatusMessage>
  return (
    <div className="space-y-6">
      <WorkflowStepper phase={view.phase} />
      <SessionContent session={session} view={view} />
    </div>
  )
}

function SessionContent({ session, view }: LiveSessionProps) {
  const { participantId, rejoining, join } = session
  if (rejoining) return <StatusMessage>Rejoining…</StatusMessage>
  if (needsToJoin(participantId, view)) return <JoinSession challenge={view.challenge} onJoin={join} />
  return <PhaseScreen session={session} view={view} />
}

function StatusMessage({ children }: { children: string }) {
  return <p className="py-12 text-center text-ink-muted">{children}</p>
}

interface LiveSessionProps {
  session: Session
  view: SessionView
}

function PhaseScreen({ session, view }: LiveSessionProps) {
  switch (view.phase) {
    case 'lobby':
      return <Lobby view={view} send={session.send} />
    case 'burst':
      return <BurstPhase session={session} view={view} />
    case 'consolidate':
      return <Consolidate view={view} send={session.send} />
    case 'vote':
      return <Vote view={view} send={session.send} />
    case 'results':
      return <Results view={view} />
  }
}

function BurstPhase({ session: { send, clockOffset, participantId }, view }: LiveSessionProps) {
  const secondsRemaining = useCountdown(view.endsAt, clockOffset)
  return <Burst view={view} send={send} secondsRemaining={secondsRemaining} participantId={participantId} />
}
