import { isFinalPhase, type SessionView } from '../../shared/protocol'
import { RejectionNotice } from '../components/RejectionNotice'
import { SessionHeader } from '../components/SessionHeader'
import { pageColumn } from '../components/ui'
import { sessionPath } from '../route'
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

function canAct({ participantId, rejoining }: Session, view: SessionView): boolean {
  return !rejoining && !needsToJoin(participantId, view)
}

function SessionBody({ session }: { session: Session }) {
  const { view } = session
  if (!view) return <div className={pageColumn}><StatusMessage>Connecting…</StatusMessage></div>
  if (view.phase === 'burst') return <TimedSession session={session} view={view} />
  return <SessionLayout session={session} view={view} secondsRemaining={0} />
}

interface SessionViewProps {
  session: Session
  view: SessionView
}

interface LiveSessionProps extends SessionViewProps {
  secondsRemaining: number
}

function TimedSession({ session, view }: SessionViewProps) {
  const secondsRemaining = useCountdown(view.endsAt, session.clockOffset)
  return <SessionLayout session={session} view={view} secondsRemaining={secondsRemaining} />
}

function SessionLayout(props: LiveSessionProps) {
  const { session, view, secondsRemaining } = props
  return (
    <div className="space-y-6">
      <SessionHeader view={view} secondsRemaining={secondsRemaining} send={canAct(session, view) ? session.send : null}
        participantId={session.participantId} />
      <div className={pageColumn}>
        <SessionContent {...props} />
      </div>
    </div>
  )
}

function SessionContent(props: LiveSessionProps) {
  const { session, view } = props
  if (session.rejoining) return <StatusMessage>Rejoining…</StatusMessage>
  if (needsToJoin(session.participantId, view)) return <JoinSession onJoin={session.join} />
  return <PhaseScreen {...props} />
}

function StatusMessage({ children }: { children: string }) {
  return <p className="py-12 text-center text-ink-muted">{children}</p>
}

function PhaseScreen({ session, view, secondsRemaining }: LiveSessionProps) {
  switch (view.phase) {
    case 'lobby':
      return <Lobby inviteUrl={inviteUrlFor(view)} copyText={copyToClipboard} />
    case 'burst':
      return <Burst view={view} send={session.send} secondsRemaining={secondsRemaining} participantId={session.participantId} />
    case 'consolidate':
      return <Consolidate view={view} send={session.send} />
    case 'vote':
      return <Vote view={view} send={session.send} />
    case 'results':
      return <Results view={view} />
  }
}

function inviteUrlFor(view: SessionView): string {
  return location.origin + sessionPath(view.id)
}

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
