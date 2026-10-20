import type { ResultView } from '../../shared/protocol'
import { groupQuestionViews } from './question-views'
import type { Group, SessionState } from './state'

type UnrankedResult = Omit<ResultView, 'rank'>

export function rankResults(state: SessionState): ResultView[] {
  const totals = voteTotalsByGroup(state)
  const unranked = Object.values(state.groups).map((group) => toUnrankedResult(group, { state, totals }))
  return withCompetitionRanks(unranked.sort(byVotesThenLabel))
}

function voteTotalsByGroup(state: SessionState): Map<string, number> {
  const totals = new Map<string, number>()
  Object.values(state.votes)
    .flatMap((ballot) => Object.entries(ballot))
    .forEach(([groupId, count]) => totals.set(groupId, (totals.get(groupId) ?? 0) + count))
  return totals
}

function toUnrankedResult(
  group: Group,
  { state, totals }: { state: SessionState; totals: Map<string, number> },
): UnrankedResult {
  return {
    groupId: group.id,
    label: group.label,
    questions: groupQuestionViews(group, state),
    votes: totals.get(group.id) ?? 0,
  }
}

function byVotesThenLabel(a: UnrankedResult, b: UnrankedResult): number {
  return b.votes - a.votes || a.label.localeCompare(b.label)
}

function withCompetitionRanks(sorted: UnrankedResult[]): ResultView[] {
  return sorted.map((result) => ({ ...result, rank: firstIndexWithVotes(sorted, result.votes) + 1 }))
}

function firstIndexWithVotes(sorted: UnrankedResult[], votes: number): number {
  return sorted.findIndex((result) => result.votes === votes)
}
