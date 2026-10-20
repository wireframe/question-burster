import type { GroupView } from '../../shared/protocol'
import { QuestionGroup } from '../components/QuestionGroup'
import type { PhaseScreenProps } from './types'

export function Consolidate({ view, send }: PhaseScreenProps) {
  return view.groupingStatus === 'pending' ? <GroupingIndicator /> : <GroupList groups={view.groups} send={send} />
}

function GroupingIndicator() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-ink-muted">
      <span aria-hidden="true" className="flex gap-1.5">
        {['bg-note-yellow', 'bg-note-pink', 'bg-note-mint'].map((color, index) => (
          <span key={color} className={`size-3 rounded-sm ${color} shadow-note motion-safe:animate-bounce`} style={{ animationDelay: `${index * 150}ms` }} />
        ))}
      </span>
      <p>Grouping similar questions…</p>
    </div>
  )
}

function GroupList({ groups, send }: Pick<PhaseScreenProps, 'send'> & { groups: GroupView[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <QuestionGroup key={group.id} group={group} otherGroups={groups.filter((other) => other !== group)} send={send} />
      ))}
    </div>
  )
}
