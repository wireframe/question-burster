import type { ResultView, SessionView } from '../../shared/protocol'
import { QuestionList } from '../components/QuestionList'
import { pluralize } from './pluralize'

export function Results({ view }: { view: SessionView }) {
  return (
    <>
      <h1>{view.challenge}</h1>
      <ol aria-label="Ranked groups" className="ranked-groups">
        {requireResults(view).map((result) => <RankedGroup key={result.groupId} result={result} />)}
      </ol>
    </>
  )
}

function requireResults(view: SessionView): ResultView[] {
  if (!view.results) throw new Error('Results are missing from the results phase')
  return view.results
}

function RankedGroup({ result }: { result: ResultView }) {
  return (
    <li className="question-group">
      <h2>#{result.rank} {result.label}</h2>
      <p>{pluralize(result.votes, 'vote')}</p>
      <QuestionList questions={result.questions} />
    </li>
  )
}
