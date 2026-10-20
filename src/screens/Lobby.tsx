import { ParticipantChip } from '../components/ParticipantChip'
import { card, sectionTitle } from '../components/ui'
import type { PhaseScreenProps } from './types'

export function Lobby({ view }: Pick<PhaseScreenProps, 'view'>) {
  return (
    <section className={`${card} space-y-4`}>
      <h2 className={sectionTitle}>Participants</h2>
      <ul className="flex flex-wrap gap-2">
        {view.participants.map((participant) => (
          <ParticipantChip key={participant.id} name={participant.name}><span>{participant.name}</span></ParticipantChip>
        ))}
      </ul>
    </section>
  )
}
