import type { ResultView, SessionView } from '../../shared/protocol'
import { card } from '../components/ui'
import { pluralize } from './pluralize'

export function Results({ view }: { view: SessionView }) {
  const results = requireResults(view)
  const mostVotes = Math.max(1, ...results.map((result) => result.votes))
  return (
    <ol aria-label="Ranked groups" className="space-y-4">
      {results.map((result) => <RankedGroup key={result.groupId} result={result} mostVotes={mostVotes} />)}
    </ol>
  )
}

function requireResults(view: SessionView): ResultView[] {
  if (!view.results) throw new Error('Results are missing from the results phase')
  return view.results
}

function RankedGroup({ result, mostVotes }: { result: ResultView; mostVotes: number }) {
  const top = result.rank === 1
  return (
    <li className={`${card} space-y-3 ${top ? 'border-2 border-accent ring-4 ring-accent-soft' : ''}`}>
      <h2 className={`flex items-center gap-3 font-semibold ${top ? 'text-xl sm:text-2xl' : 'text-lg'}`}>
        <RankBadge rank={result.rank} />{' '}
        <span className="min-w-0 break-words">{result.label}</span>
      </h2>
      <VoteBar votes={result.votes} mostVotes={mostVotes} />
    </li>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const style = rank === 1 ? 'size-11 bg-accent text-white text-lg' : 'size-9 bg-accent-soft text-accent text-sm'
  return <span className={`flex shrink-0 items-center justify-center rounded-full font-bold ${style}`}>#{rank}</span>
}

function VoteBar({ votes, mostVotes }: { votes: number; mostVotes: number }) {
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden="true" className="h-2.5 flex-1 overflow-hidden rounded-full bg-accent-soft">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(votes / mostVotes) * 100}%` }} />
      </div>
      <p className="w-16 text-right text-sm font-semibold tabular-nums">{pluralize(votes, 'vote')}</p>
    </div>
  )
}
