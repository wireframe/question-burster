import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SessionView } from '../../shared/protocol'
import { buildView } from '../test-support'
import { Vote } from './Vote'

const voteView = buildView({
  phase: 'vote',
  participants: [
    { id: 'p1', name: 'Ada', done: true },
    { id: 'p2', name: 'Grace', done: true },
    { id: 'p3', name: 'Linus', done: false },
  ],
  groups: [
    {
      id: 'g1',
      label: 'Review speed',
      version: 0,
      questions: [
        { id: 'q1', text: 'Why do reviews take days?', color: 0 },
        { id: 'q2', text: 'Who reviews what?', color: 1 },
      ],
    },
    { id: 'g2', label: 'Deploys', version: 0, questions: [{ id: 'q3', text: 'Why are deploys scary?', color: 0 }] },
  ],
  myVotes: { g1: 2 },
  votesRemaining: 1,
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
  it('shows each group\'s label with the viewer\'s own dot count', () => {
    renderVote()

    expect(within(groupCard('Review speed')).getByRole('heading', { name: 'Review speed' })).toBeInTheDocument()
    expect(within(groupCard('Review speed')).getByText('2 votes')).toBeInTheDocument()
    expect(within(groupCard('Deploys')).getByText('0 votes')).toBeInTheDocument()
  })

  it('shows only the consolidated label, not the constituent questions', () => {
    renderVote()

    expect(screen.queryByText('Why do reviews take days?')).not.toBeInTheDocument()
    expect(screen.queryByText('Who reviews what?')).not.toBeInTheDocument()
    expect(screen.queryByText('Why are deploys scary?')).not.toBeInTheDocument()
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
})
