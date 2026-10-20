import { useEffect, useState } from 'react'
import { card, secondaryButton, textField } from '../components/ui'

const COPIED_CONFIRMATION_MS = 2_000

interface LobbyProps {
  inviteUrl: string
  copyText: (text: string) => Promise<void>
}

export function Lobby({ inviteUrl, copyText }: LobbyProps) {
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="text-lg font-semibold">Invite others</h2>
      <p className="text-sm text-ink-muted">Share this link so everyone can join before the burst starts.</p>
      <label htmlFor="invite-url" className="sr-only">Session link</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="invite-url" readOnly value={inviteUrl} className={`${textField} min-w-0 flex-1 text-sm`}
          onFocus={(event) => event.target.select()} />
        <CopyButton onCopy={() => copyText(inviteUrl)} />
      </div>
    </section>
  )
}

function CopyButton({ onCopy }: { onCopy: () => Promise<void> }) {
  const [copied, setCopied] = useCopiedConfirmation()
  return (
    <button type="button" className={`${secondaryButton} shrink-0`} onClick={() => onCopy().then(() => setCopied(true))}>
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

function useCopiedConfirmation() {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_CONFIRMATION_MS)
    return () => clearTimeout(timer)
  }, [copied])
  return [copied, setCopied] as const
}
