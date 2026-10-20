import type { ClientCommand, SessionView } from '../../shared/protocol'

export interface PhaseScreenProps {
  view: SessionView
  send: (command: ClientCommand) => void
}
