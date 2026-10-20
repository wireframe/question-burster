import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SessionView } from '../../shared/protocol'
import { buildView } from '../test-support'
import { Vote } from './Vote'

const voteView = buildView({
  phase: 'vote',
  participants: [
    { id: 'p1', name: 'Ada', questionCount: 2, done: true },
    { id: 'p2', name: 'Grace', questionCount: 3, done: true },
    { id: 'p3', name: 'Linus', questionCount: 1, done: false },
  ],
  groups: [
    {
      id: 'g1',
      label: 'Review speed',
      version: 0,
      questions: [
        { id: 'q1', text: 'Why do reviews take days?' },
        { id: 'q2', text: 'Who reviews what?' },
      ],
    },
    { id: 'g2', label: 'Deploys', version: 0, questions: [{ id: 'q3', text: 'Why are deploys scary?' }] },
  ],
  myVotes: { g1: 2 },
  votesRemaining: 1,
  votersDone: 1,
})

function renderVote(view: SessionView = voteView) {
  const send = vi.fn()
  render(<Vote view={view} send={send} />)
  return { send, user: userEvent.setup() }
}

function groupCard(label: string) {
  return screen.getByRole('group', { name: label })
}

describe('Vote', () => {
  it('shows each group with its questions and the viewer\'s own dot count', () => {
    renderVote()

    expect(within(groupCard('Review speed')).getByText('Why do reviews take days?')).toBeInTheDocument()
    expect(within(groupCard('Review speed')).getByText('Who reviews what?')).toBeInTheDocument()
    expect(within(groupCard('Review speed')).getByText('2 votes')).toBeInTheDocument()
    expect(within(groupCard('Deploys')).getByText('Why are deploys scary?')).toBeInTheDocument()
    expect(within(groupCard('Deploys')).getByText('0 votes')).toBeInTheDocument()
  })

  it('casts a vote for a group', async () => {
    const { send, user } = renderVote()

    await user.click(screen.getByRole('button', { name: 'Add vote to Deploys' }))

    expect(send).toHaveBeenCalledWith({ type: 'castVote', groupId: 'g2' })
  })

  it('removes a vote from a group', async () => {
    const { send, user } = renderVote()

    await user.click(screen.getByRole('button', { name: 'Remove vote from Review speed' }))

    expect(send).toHaveBeenCalledWith({ type: 'removeVote', groupId: 'g1' })
  })

  it('disables adding votes when none remain', () => {
    renderVote({ ...voteView, votesRemaining: 0 })

    expect(screen.getByRole('button', { name: 'Add vote to Review speed' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add vote to Deploys' })).toBeDisabled()
  })

  it('disables removing votes from a group the viewer has not voted for', () => {
    renderVote()

    expect(screen.getByRole('button', { name: 'Remove vote from Deploys' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove vote from Review speed' })).toBeEnabled()
  })

  it('shows votes left and how many people are done', () => {
    renderVote()

    expect(screen.getByText('1 vote left')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 people done')).toBeInTheDocument()
  })

  it('advances to results when Show results is clicked', async () => {
    const { send, user } = renderVote()

    await user.click(screen.getByRole('button', { name: 'Show results' }))

    expect(send).toHaveBeenCalledWith({ type: 'advance', fromPhase: 'vote' })
  })
})
