import { VOTES_PER_PERSON, type GroupView } from '../../shared/protocol'
import { VoteDots } from '../components/VoteDots'
import { card, roundButton } from '../components/ui'
import { pluralize } from './pluralize'
import type { PhaseScreenProps } from './types'

export function Vote({ view, send }: PhaseScreenProps) {
  return (
    <div className="space-y-3">
      {view.groups.map((group) => (
        <VotableGroup key={group.id} group={group} view={view} send={send} />
      ))}
    </div>
  )
}

interface VotableGroupProps extends PhaseScreenProps {
  group: GroupView
}

function VotableGroup({ group, view, send }: VotableGroupProps) {
  return (
    <div role="group" className={`${card} flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`} aria-label={group.label}>
      <h2 className="min-w-0 text-lg leading-snug font-semibold break-words">{group.label}</h2>
      <VoteControls group={group} view={view} send={send} />
    </div>
  )
}

function VoteControls({ group, view, send }: VotableGroupProps) {
  const myCount = view.myVotes[group.id] ?? 0
  return (
    <div className="flex shrink-0 items-center justify-end gap-3">
      <VoteDots filled={myCount} total={VOTES_PER_PERSON} />
      <span className="min-w-14 text-sm text-ink-muted">{pluralize(myCount, 'vote')}</span>
      <button type="button" className={roundButton} aria-label={`Remove vote from ${group.label}`} disabled={myCount === 0}
        onClick={() => send({ type: 'removeVote', groupId: group.id })}>−</button>
      <button type="button" className={roundButton} aria-label={`Add vote to ${group.label}`} disabled={view.votesRemaining === 0}
        onClick={() => send({ type: 'castVote', groupId: group.id })}>+</button>
    </div>
  )
}
