import type { ReactNode } from 'react'

interface ParticipantChipProps {
  name: string
  highlighted?: boolean
  children: ReactNode
}

export function ParticipantChip({ name, highlighted = false, children }: ParticipantChipProps) {
  return (
    <li className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm ${highlighted ? 'border-success/40 bg-success/5' : 'border-line bg-surface'}`}>
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
        {name.charAt(0).toUpperCase()}
      </span>
      {children}
    </li>
  )
}
