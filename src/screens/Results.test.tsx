import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildView } from '../test-support'
import { Results } from './Results'

const resultsView = buildView({
  phase: 'results',
  results: [
    {
      groupId: 'g1',
      label: 'Review speed',
      questions: [
        { id: 'q1', text: 'Why do reviews take days?', color: 0 },
        { id: 'q2', text: 'Who reviews what?', color: 1 },
      ],
      votes: 5,
      rank: 1,
    },
    { groupId: 'g2', label: 'Deploys', questions: [{ id: 'q3', text: 'Why are deploys scary?', color: 0 }], votes: 1, rank: 2 },
    { groupId: 'g3', label: 'Testing', questions: [{ id: 'q4', text: 'Why is CI slow?', color: 2 }], votes: 1, rank: 2 },
  ],
})

function rankedItems() {
  return Array.from(screen.getByRole('list', { name: 'Ranked groups' }).children) as HTMLElement[]
}

describe('Results', () => {
  it('lists the ranked groups in order with rank, label and vote count', () => {
    render(<Results view={resultsView} />)

    const items = rankedItems()
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByRole('heading', { name: '#1 Review speed' })).toBeInTheDocument()
    expect(within(items[0]).getByText('5 votes')).toBeInTheDocument()
    expect(within(items[1]).getByRole('heading', { name: '#2 Deploys' })).toBeInTheDocument()
    expect(within(items[1]).getByText('1 vote')).toBeInTheDocument()
    expect(within(items[2]).getByRole('heading', { name: '#2 Testing' })).toBeInTheDocument()
  })

  it('shows one entry per group without its constituent questions', () => {
    render(<Results view={resultsView} />)

    for (const text of ['Why do reviews take days?', 'Who reviews what?', 'Why are deploys scary?', 'Why is CI slow?']) {
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    }
    expect(screen.queryAllByRole('list')).toHaveLength(1)
  })

  it('has no advance or editing controls', () => {
    render(<Results view={resultsView} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
