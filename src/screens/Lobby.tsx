import { ChallengeBanner } from '../components/ChallengeBanner'
import { ParticipantChip } from '../components/ParticipantChip'
import { actionBar, card, sectionTitle } from '../components/ui'
import { AdvanceButton } from './AdvanceButton'
import type { PhaseScreenProps } from './types'

export function Lobby({ view, send }: PhaseScreenProps) {
  return (
    <div className="space-y-6">
      <ChallengeBanner challenge={view.challenge} />
      <section className={`${card} space-y-4`}>
        <h2 className={sectionTitle}>Participants</h2>
        <ul className="flex flex-wrap gap-2">
          {view.participants.map((participant) => (
            <ParticipantChip key={participant.id} name={participant.name}><span>{participant.name}</span></ParticipantChip>
          ))}
        </ul>
      </section>
      <div className={actionBar}>
        <AdvanceButton phase="lobby" send={send}>Start burst</AdvanceButton>
      </div>
    </div>
  )
}
