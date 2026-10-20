import { isFinalPhase, type SessionView } from '../../shared/protocol'
import { useCountdown } from '../session/useCountdown'
import { useSession, type Session } from '../session/useSession'
import { Burst } from './Burst'
import { JoinSession } from './JoinSession'
import { Lobby } from './Lobby'
import { Placeholder } from './Placeholder'

export function SessionScreen({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId)
  return (
    <>
      {session.lastRejection && <p role="alert">{session.lastRejection}</p>}
      <SessionBody session={session} />
    </>
  )
}

function needsToJoin(participantId: string | null, view: SessionView): boolean {
  return participantId == null && !isFinalPhase(view.phase)
}

function SessionBody({ session }: { session: Session }) {
  const { view, participantId, rejoining, join } = session
  if (!view) return <p>Connecting…</p>
  if (rejoining) return <p>Rejoining…</p>
  if (needsToJoin(participantId, view)) return <JoinSession challenge={view.challenge} onJoin={join} />
  return <PhaseScreen session={session} view={view} />
}

/** A session whose first state has arrived. */
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
    default:
      return <Placeholder view={view} send={session.send} />
  }
}

function BurstPhase({ session: { send, clockOffset, participantId }, view }: LiveSessionProps) {
  const secondsRemaining = useCountdown(view.endsAt, clockOffset)
  return <Burst view={view} send={send} secondsRemaining={secondsRemaining} participantId={participantId} />
}
