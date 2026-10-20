import type { GroupView } from '../../shared/protocol'
import { QuestionGroup } from '../components/QuestionGroup'
import { AdvanceButton } from './AdvanceButton'
import type { PhaseScreenProps } from './types'

export function Consolidate({ view, send }: PhaseScreenProps) {
  const pending = view.groupingStatus === 'pending'
  return (
    <>
      <h1>{view.challenge}</h1>
      {pending ? <p>Grouping similar questions…</p> : <GroupList groups={view.groups} send={send} />}
      <AdvanceButton phase="consolidate" send={send} disabled={pending}>Start voting</AdvanceButton>
    </>
  )
}

function GroupList({ groups, send }: Pick<PhaseScreenProps, 'send'> & { groups: GroupView[] }) {
  return groups.map((group) => (
    <QuestionGroup key={group.id} group={group} otherGroups={groups.filter((other) => other !== group)} send={send} />
  ))
}
