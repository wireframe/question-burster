import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JoinSession } from './JoinSession'

function renderScreen() {
  const onJoin = vi.fn()
  render(<JoinSession challenge="How might we ship faster?" onJoin={onJoin} />)
  return { onJoin, user: userEvent.setup() }
}

describe('JoinSession', () => {
  it('shows the challenge being joined', () => {
    renderScreen()

    expect(screen.getByRole('heading', { name: 'How might we ship faster?' })).toBeInTheDocument()
  })

  it('joins with the trimmed name', async () => {
    const { onJoin, user } = renderScreen()

    await user.type(screen.getByLabelText('Your name'), '  Ada  ')
    await user.click(screen.getByRole('button', { name: 'Join' }))

    expect(onJoin).toHaveBeenCalledWith('Ada')
  })

  it('blocks joining with a blank name', async () => {
    const { onJoin, user } = renderScreen()

    await user.type(screen.getByLabelText('Your name'), '   ')

    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled()
    expect(onJoin).not.toHaveBeenCalled()
  })
})
