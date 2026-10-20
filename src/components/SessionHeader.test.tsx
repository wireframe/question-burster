import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Phase, SessionView } from '../../shared/protocol'
import { buildView } from '../test-support'
import { SessionHeader, type SessionHeaderProps } from './SessionHeader'

function renderHeader(overrides: Partial<SessionHeaderProps> = {}) {
  const send = vi.fn()
  render(<SessionHeader view={buildView()} secondsRemaining={0} send={send} participantId={null} {...overrides} />)
  return { send, user: userEvent.setup() }
}

function viewIn(phase: Phase, overrides: Partial<SessionView> = {}) {
  return buildView({ phase, groupingStatus: 'ready', results: [], ...overrides })
}

function currentStepCallout() {
  return screen.getByRole('group', { name: 'Current step' })
}

describe('SessionHeader', () => {
  it('shows the labelled challenge as the page heading', () => {
    renderHeader({ view: buildView({ challenge: 'How might we ship faster?' }) })

    expect(screen.getByText('The challenge')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'How might we ship faster?' })).toBeInTheDocument()
  })

  it('shows the hint inside the current step callout', () => {
    renderHeader({ view: viewIn('consolidate') })

    expect(within(currentStepCallout()).getByText(/Merge questions that ask the same thing/)).toBeInTheDocument()
  })

  it.each([
    ['lobby', 'Start burst'],
    ['burst', 'End burst'],
    ['consolidate', 'Start voting'],
    ['vote', 'Show results'],
  ] as const)('advances from %s with the %s button in the current step callout', async (phase, label) => {
    const { send, user } = renderHeader({ view: viewIn(phase), secondsRemaining: 60 })

    await user.click(within(currentStepCallout()).getByRole('button', { name: label }))

    expect(send).toHaveBeenCalledWith({ type: 'advance', fromPhase: phase })
  })

  it('disables Start voting while grouping is pending', () => {
    renderHeader({ view: viewIn('consolidate', { groupingStatus: 'pending' }) })

    expect(screen.getByRole('button', { name: 'Start voting' })).toBeDisabled()
  })

  it('offers no next step on the results', () => {
    renderHeader({ view: viewIn('results') })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers no next step to a viewer who cannot act yet', () => {
    renderHeader({ view: viewIn('lobby'), send: null })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the countdown during the burst', () => {
    renderHeader({ view: viewIn('burst'), secondsRemaining: 125 })

    expect(within(currentStepCallout()).getByRole('timer')).toHaveTextContent('2:05')
  })

  it('shows time\'s up when the countdown reaches zero', () => {
    renderHeader({ view: viewIn('burst'), secondsRemaining: 0 })

    expect(screen.getByRole('timer')).toHaveTextContent('Time\'s up')
  })

  it('shows no countdown outside the burst', () => {
    renderHeader({ view: viewIn('lobby'), secondsRemaining: 125 })

    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
  })

  it('shows the votes left during the vote, leaving who is done to the participant avatars', () => {
    renderHeader({ view: viewIn('vote', { votesRemaining: 1 }) })

    expect(within(currentStepCallout()).getByText('1 vote left')).toBeInTheDocument()
    expect(within(currentStepCallout()).queryByText(/people done/)).not.toBeInTheDocument()
  })

  it('shows each participant with the viewer and done state', () => {
    renderHeader({
      view: viewIn('vote', { participants: [{ id: 'p1', name: 'Ada', done: true }, { id: 'p2', name: 'Grace', done: false }] }),
      participantId: 'p2',
    })

    const participants = screen.getByRole('list', { name: 'Participants' })
    expect(within(participants).getByTitle('Ada, done')).toBeInTheDocument()
    expect(within(participants).getByTitle('Grace (you)')).toBeInTheDocument()
  })
})
