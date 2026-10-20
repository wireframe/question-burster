import { isFinalPhase } from '../../shared/protocol'
import { AdvanceButton } from './AdvanceButton'
import type { PhaseScreenProps } from './types'

export function Placeholder({ view, send }: PhaseScreenProps) {
  return (
    <>
      <h1>{view.challenge}</h1>
      <p>Phase: {view.phase}</p>
      {!isFinalPhase(view.phase) && <AdvanceButton phase={view.phase} send={send} />}
    </>
  )
}
