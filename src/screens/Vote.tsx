import { VOTES_PER_PERSON, type GroupView } from '../../shared/protocol'
import { ChallengeBanner } from '../components/ChallengeBanner'
import { QuestionList } from '../components/QuestionList'
import { VoteDots } from '../components/VoteDots'
import { actionBar, card, roundButton } from '../components/ui'
import { AdvanceButton } from './AdvanceButton'
import { pluralize } from './pluralize'
import type { PhaseScreenProps } from './types'

export function Vote({ view, send }: PhaseScreenProps) {
  return (
    <div className="space-y-6">
      <ChallengeBanner challenge={view.challenge} />
      <VoteProgress view={view} />
      <div className="space-y-4">
        {view.groups.map((group) => (
          <VotableGroup key={group.id} group={group} view={view} send={send} />
        ))}
      </div>
      <div className={actionBar}>
        <AdvanceButton phase="vote" send={send}>Show results</AdvanceButton>
      </div>
    </div>
  )
}

function VoteProgress({ view }: Pick<PhaseScreenProps, 'view'>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-card">
      <span className="inline-flex items-center gap-2 font-semibold">
        <VoteDots filled={view.votesRemaining} total={VOTES_PER_PERSON} />
        <span>{pluralize(view.votesRemaining, 'vote')} left</span>
      </span>
      <span className="text-ink-muted">{view.votersDone} of {view.participants.length} people done</span>
    </div>
  )
}

interface VotableGroupProps extends PhaseScreenProps {
  group: GroupView
}

function VotableGroup({ group, view, send }: VotableGroupProps) {
  return (
    <div role="group" className={`${card} min-w-0 space-y-4`} aria-label={group.label}>
      <h2 className="text-lg font-semibold break-words">{group.label}</h2>
      <QuestionList questions={group.questions} />
      <VoteControls group={group} view={view} send={send} />
    </div>
  )
}

function VoteControls({ group, view, send }: VotableGroupProps) {
  const myCount = view.myVotes[group.id] ?? 0
  return (
    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
      <VoteDots filled={myCount} total={VOTES_PER_PERSON} />
      <span className="min-w-14 text-sm text-ink-muted">{pluralize(myCount, 'vote')}</span>
      <button type="button" className={roundButton} aria-label={`Remove vote from ${group.label}`} disabled={myCount === 0}
        onClick={() => send({ type: 'removeVote', groupId: group.id })}>−</button>
      <button type="button" className={roundButton} aria-label={`Add vote to ${group.label}`} disabled={view.votesRemaining === 0}
        onClick={() => send({ type: 'castVote', groupId: group.id })}>+</button>
    </div>
  )
}
