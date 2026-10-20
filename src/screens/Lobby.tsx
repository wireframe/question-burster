import { AdvanceButton } from './AdvanceButton'
import type { PhaseScreenProps } from './types'

export function Lobby({ view, send }: PhaseScreenProps) {
  return (
    <>
      <h1>{view.challenge}</h1>
      <h2>Participants</h2>
      <ul>
        {view.participants.map((participant) => <li key={participant.id}>{participant.name}</li>)}
      </ul>
      <AdvanceButton phase="lobby" send={send}>Start burst</AdvanceButton>
    </>
  )
}
