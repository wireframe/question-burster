import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildView } from '../test-support'
import { Lobby } from './Lobby'

const view = buildView({
  challenge: 'How might we ship faster?',
  participants: [
    { id: 'p1', name: 'Ada', questionCount: 0, done: false },
    { id: 'p2', name: 'Grace', questionCount: 0, done: false },
  ],
})

describe('Lobby', () => {
  it('shows the challenge and participant names', () => {
    render(<Lobby view={view} send={vi.fn()} />)

    expect(screen.getByText('How might we ship faster?')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Grace')).toBeInTheDocument()
  })

  it('advances from the lobby when Start burst is clicked', async () => {
    const send = vi.fn()
    render(<Lobby view={view} send={send} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Start burst' }))

    expect(send).toHaveBeenCalledWith({ type: 'advance', fromPhase: 'lobby' })
  })
})
