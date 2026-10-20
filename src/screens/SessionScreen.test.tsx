import { render, screen } from '@testing-library/react'
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
    ...overrides,
  }
  vi.mocked(useSession).mockReturnValue(session)
  render(<SessionScreen sessionId="s1" />)
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

  it('shows the placeholder to a participant in a later phase', () => {
    renderWithSession({ participantId: 'p1', view: buildView({ phase: 'consolidate' }) })

    expect(screen.getByText('Phase: consolidate')).toBeInTheDocument()
  })

  it('lets a spectator see results without joining', () => {
    renderWithSession({ view: buildView({ phase: 'results' }) })

    expect(screen.getByText('Phase: results')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument()
  })

  it('shows the last rejection as an alert', () => {
    renderWithSession({ lastRejection: 'Session not found' })

    expect(screen.getByRole('alert')).toHaveTextContent('Session not found')
  })
})
