/** Turns authoritative session state into the view a given client may see. */
import type { ParticipantView, SessionView } from '../../shared/protocol'
import type { Participant, SessionState } from './state'

export function projectForClient(state: SessionState, _viewerId: string | null): SessionView {
  return {
    id: state.id,
    challenge: state.challenge,
    burstSeconds: state.burstSeconds,
    phase: state.phase,
    endsAt: state.endsAt,
    participants: Object.values(state.participants).map(projectParticipant),
  }
}

function projectParticipant(participant: Participant): ParticipantView {
  return { id: participant.id, name: participant.name, questionCount: 0, done: participant.done }
}
