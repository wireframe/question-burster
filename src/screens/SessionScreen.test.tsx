import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSession, type Session } from '../session/useSession'
import { buildView } from '../test-support'
import { SessionScreen } from './SessionScreen'

vi.mock('../session/useSession', () => ({ useSession: vi.fn() }))

function renderWithSession(overrides: Partial<Session>) {
  const session: Session = {
    view: buildView(),
    participantId: null,
    clockOffset: 0,
    lastRejection: null,
    rejoining: false,
    send: vi.fn(),
    join: vi.fn(),
    dismissRejection: vi.fn(),
    ...overrides,
  }
  vi.mocked(useSession).mockReturnValue(session)
  render(<SessionScreen sessionId="s1" />)
  return session
}

function currentStep() {
  const steps = within(screen.getByRole('list', { name: 'Session progress' })).getAllByRole('listitem')
  return steps.find((step) => step.getAttribute('aria-current') === 'step')
}

describe('SessionScreen', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers to join when the viewer is not a participant', () => {
    renderWithSession({})

    expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument()
  })

  it('shows rejoining instead of the join form while rejoining', () => {
    renderWithSession({ rejoining: true })

    expect(screen.getByText('Rejoining…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument()
  })

  it('shows connecting until the first state arrives', () => {
    renderWithSession({ view: null })

    expect(screen.getByText('Connecting…')).toBeInTheDocument()
  })

  it('shows the lobby to a participant in the lobby', () => {
    renderWithSession({ participantId: 'p1' })

    expect(screen.getByRole('button', { name: 'Start burst' })).toBeInTheDocument()
  })

  it('shows the burst with its countdown to a participant in the burst', () => {
    vi.useFakeTimers({ now: 100_000, toFake: ['Date'] })
    renderWithSession({ participantId: 'p1', clockOffset: 5_000, view: buildView({ phase: 'burst', endsAt: 230_000 }) })

    expect(screen.getByLabelText('Your question')).toBeInTheDocument()
    expect(screen.getByText('2:05')).toBeInTheDocument()
  })

  it('shows consolidation to a participant in the consolidate phase', () => {
    renderWithSession({ participantId: 'p1', view: buildView({ phase: 'consolidate', groupingStatus: 'pending' }) })

    expect(screen.getByText('Grouping similar questions…')).toBeInTheDocument()
  })

  it('shows voting to a participant in the vote phase', () => {
    renderWithSession({ participantId: 'p1', view: buildView({ phase: 'vote' }) })

    expect(screen.getByRole('button', { name: 'Show results' })).toBeInTheDocument()
  })

  it('lets a spectator see results without joining', () => {
    renderWithSession({ view: buildView({ phase: 'results', results: [] }) })

    expect(screen.getByRole('list', { name: 'Ranked groups' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument()
  })

  it('shows session progress on the join screen', () => {
    renderWithSession({})

    expect(currentStep()).toHaveTextContent('Join')
  })

  it.each([
    ['lobby', 'Join'],
    ['consolidate', 'Consolidate'],
    ['vote', 'Vote'],
  ] as const)('marks the %s phase as the current step', (phase, label) => {
    renderWithSession({ participantId: 'p1', view: buildView({ phase, groupingStatus: 'pending' }) })

    expect(currentStep()).toHaveTextContent(label)
  })

  it('shows session progress on the results', () => {
    renderWithSession({ view: buildView({ phase: 'results', results: [] }) })

    expect(currentStep()).toHaveTextContent('Results')
  })

  it('shows no session progress while connecting', () => {
    renderWithSession({ view: null })

    expect(screen.queryByRole('list', { name: 'Session progress' })).not.toBeInTheDocument()
  })

  it('shows the last rejection as an alert', () => {
    renderWithSession({ lastRejection: 'Session not found' })

    expect(screen.getByRole('alert')).toHaveTextContent('Session not found')
  })

  it('dismisses the rejection through the session', async () => {
    const session = renderWithSession({ lastRejection: 'Session not found' })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(session.dismissRejection).toHaveBeenCalled()
  })
})
