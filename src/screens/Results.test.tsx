import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildView } from '../test-support'
import { Results } from './Results'

const resultsView = buildView({
  phase: 'results',
  challenge: 'How might we ship faster?',
  results: [
    {
      groupId: 'g1',
      label: 'Review speed',
      questions: [
        { id: 'q1', text: 'Why do reviews take days?' },
        { id: 'q2', text: 'Who reviews what?' },
      ],
      votes: 5,
      rank: 1,
    },
    { groupId: 'g2', label: 'Deploys', questions: [{ id: 'q3', text: 'Why are deploys scary?' }], votes: 1, rank: 2 },
    { groupId: 'g3', label: 'Testing', questions: [{ id: 'q4', text: 'Why is CI slow?' }], votes: 1, rank: 2 },
  ],
})

function rankedItems() {
  return Array.from(screen.getByRole('list', { name: 'Ranked groups' }).children) as HTMLElement[]
}

describe('Results', () => {
  it('shows the challenge', () => {
    render(<Results view={resultsView} />)

    expect(screen.getByRole('heading', { name: 'How might we ship faster?' })).toBeInTheDocument()
  })

  it('lists the ranked groups in order with rank, label and vote count', () => {
    render(<Results view={resultsView} />)

    const items = rankedItems()
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('#1 Review speed')).toBeInTheDocument()
    expect(within(items[0]).getByText('5 votes')).toBeInTheDocument()
    expect(within(items[1]).getByText('#2 Deploys')).toBeInTheDocument()
    expect(within(items[1]).getByText('1 vote')).toBeInTheDocument()
    expect(within(items[2]).getByText('#2 Testing')).toBeInTheDocument()
  })

  it('shows each group\'s constituent questions', () => {
    render(<Results view={resultsView} />)

    const [first, second] = rankedItems()
    expect(within(first).getByText('Why do reviews take days?')).toBeInTheDocument()
    expect(within(first).getByText('Who reviews what?')).toBeInTheDocument()
    expect(within(second).getByText('Why are deploys scary?')).toBeInTheDocument()
  })

  it('has no advance or editing controls', () => {
    render(<Results view={resultsView} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
