import type { GroupView } from '../../shared/protocol'
import { QuestionList } from '../components/QuestionList'
import { AdvanceButton } from './AdvanceButton'
import { pluralize } from './pluralize'
import type { PhaseScreenProps } from './types'

export function Vote({ view, send }: PhaseScreenProps) {
  return (
    <>
      <h1>{view.challenge}</h1>
      <VoteProgress view={view} />
      {view.groups.map((group) => (
        <VotableGroup key={group.id} group={group} view={view} send={send} />
      ))}
      <AdvanceButton phase="vote" send={send}>Show results</AdvanceButton>
    </>
  )
}

function VoteProgress({ view }: Pick<PhaseScreenProps, 'view'>) {
  return (
    <p>
      <span>{pluralize(view.votesRemaining, 'vote')} left</span>
      {' · '}
      <span>{view.votersDone} of {view.participants.length} people done</span>
    </p>
  )
}

interface VotableGroupProps extends PhaseScreenProps {
  group: GroupView
}

function VotableGroup({ group, view, send }: VotableGroupProps) {
  return (
    <fieldset className="question-group" aria-label={group.label}>
      <legend>{group.label}</legend>
      <QuestionList questions={group.questions} />
      <VoteControls group={group} view={view} send={send} />
    </fieldset>
  )
}

function VoteControls({ group, view, send }: VotableGroupProps) {
  const myCount = view.myVotes[group.id] ?? 0
  return (
    <div className="vote-controls">
      <button type="button" aria-label={`Remove vote from ${group.label}`} disabled={myCount === 0}
        onClick={() => send({ type: 'removeVote', groupId: group.id })}>−</button>
      <span>{pluralize(myCount, 'vote')}</span>
      <button type="button" aria-label={`Add vote to ${group.label}`} disabled={view.votesRemaining === 0}
        onClick={() => send({ type: 'castVote', groupId: group.id })}>+</button>
    </div>
  )
}
