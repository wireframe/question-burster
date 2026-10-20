import type { ReactNode } from 'react'
import type { Phase } from '../../shared/protocol'
import type { PhaseScreenProps } from './types'

interface AdvanceButtonProps extends Pick<PhaseScreenProps, 'send'> {
  phase: Phase
  children?: ReactNode
  disabled?: boolean
}

export function AdvanceButton({ phase, send, children = 'Next phase →', disabled = false }: AdvanceButtonProps) {
  return (
    <button type="button" disabled={disabled} onClick={() => send({ type: 'advance', fromPhase: phase })}>
      {children}
    </button>
  )
}
