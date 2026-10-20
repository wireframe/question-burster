import { isFinalPhase, type SessionView } from '../../shared/protocol'
import { useSession, type Session } from '../session/useSession'
import { JoinSession } from './JoinSession'
import { Lobby } from './Lobby'
import { Placeholder } from './Placeholder'
import type { PhaseScreenProps } from './types'

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

function SessionBody({ session: { view, participantId, rejoining, join, send } }: { session: Session }) {
  if (!view) return <p>Connecting…</p>
  if (rejoining) return <p>Rejoining…</p>
  if (needsToJoin(participantId, view)) return <JoinSession challenge={view.challenge} onJoin={join} />
  return <PhaseScreen view={view} send={send} />
}

function PhaseScreen({ view, send }: PhaseScreenProps) {
  switch (view.phase) {
    case 'lobby':
      return <Lobby view={view} send={send} />
    default:
      return <Placeholder view={view} send={send} />
  }
}
