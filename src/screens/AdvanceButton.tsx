import type { ReactNode } from 'react'
import type { Phase } from '../../shared/protocol'
import type { PhaseScreenProps } from './types'

interface AdvanceButtonProps extends Pick<PhaseScreenProps, 'send'> {
  phase: Phase
  children?: ReactNode
}

export function AdvanceButton({ phase, send, children = 'Next phase →' }: AdvanceButtonProps) {
  return (
    <button type="button" onClick={() => send({ type: 'advance', fromPhase: phase })}>
      {children}
    </button>
  )
}
