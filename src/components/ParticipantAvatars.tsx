import type { ParticipantView } from '../../shared/protocol'

const SMALL_SCREEN_LIMIT = 6

interface ParticipantAvatarsProps {
  participants: ParticipantView[]
  viewerId: string | null
}

export function ParticipantAvatars({ participants, viewerId }: ParticipantAvatarsProps) {
  return (
    <ul aria-label="Participants" className="flex shrink-0 flex-wrap -space-x-1.5 sm:max-w-[40%] sm:justify-end">
      {participants.map((participant, index) => (
        <Avatar key={participant.id} participant={participant} isViewer={participant.id === viewerId}
          hiddenOnSmallScreens={index >= SMALL_SCREEN_LIMIT} />
      ))}
      <OverflowSummary hidden={participants.slice(SMALL_SCREEN_LIMIT)} />
    </ul>
  )
}

interface AvatarProps {
  participant: ParticipantView
  isViewer: boolean
  hiddenOnSmallScreens: boolean
}

const circle = 'relative flex size-7 items-center justify-center rounded-full border text-xs font-semibold ring-2 ring-paper'

function Avatar({ participant, isViewer, hiddenOnSmallScreens }: AvatarProps) {
  const details = labelDetails(participant, isViewer)
  return (
    <li title={participant.name + details} className={`${circle} ${avatarTone(participant, isViewer)} ${hiddenOnSmallScreens ? 'hidden sm:flex' : ''}`}>
      <span aria-hidden="true">{participant.name.charAt(0).toUpperCase()}</span>
      <span className="sr-only">{participant.name}</span>
      {details && <span className="sr-only">{details}</span>}
      {participant.done && <DoneBadge />}
    </li>
  )
}

function labelDetails({ done }: ParticipantView, isViewer: boolean): string {
  return `${isViewer ? ' (you)' : ''}${done ? ', done' : ''}`
}

function avatarTone({ done }: ParticipantView, isViewer: boolean): string {
  if (done) return 'border-accent/50 bg-accent-soft text-accent'
  return isViewer ? 'border-ink-muted/50 bg-surface text-ink' : 'border-line bg-surface text-ink-muted'
}

function DoneBadge() {
  return (
    <span data-testid="done-badge" aria-hidden="true"
      className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-accent text-white ring-2 ring-paper">
      <svg viewBox="0 0 16 16" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  )
}

function OverflowSummary({ hidden }: { hidden: ParticipantView[] }) {
  if (hidden.length === 0) return null
  return (
    <li title={hidden.map((participant) => participant.name).join(', ')}
      className={`${circle} border-line bg-surface text-ink-muted sm:hidden`}>
      +{hidden.length}
    </li>
  )
}
