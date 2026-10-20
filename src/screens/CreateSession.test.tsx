import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CreateSession } from './CreateSession'

function renderScreen(createSession = vi.fn(async () => 'abc')) {
  const onCreated = vi.fn()
  render(<CreateSession createSession={createSession} onCreated={onCreated} />)
  return { createSession, onCreated, user: userEvent.setup() }
}

async function fillDuration(user: ReturnType<typeof userEvent.setup>, minutes: string) {
  const duration = screen.getByLabelText('Burst length (minutes)')
  await user.clear(duration)
  await user.type(duration, minutes)
}

describe('CreateSession', () => {
  it('submits the challenge with the duration converted to seconds', async () => {
    const { createSession, onCreated, user } = renderScreen()

    await user.type(screen.getByLabelText('Challenge'), 'How might we ship faster?')
    await fillDuration(user, '4')
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(createSession).toHaveBeenCalledWith({ challenge: 'How might we ship faster?', burstSeconds: 240 })
    expect(onCreated).toHaveBeenCalledWith('abc')
  })

  it('blocks submitting a blank challenge', async () => {
    const { createSession, user } = renderScreen()

    await user.type(screen.getByLabelText('Challenge'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(screen.getByRole('button', { name: 'Create session' })).toBeDisabled()
    expect(createSession).not.toHaveBeenCalled()
  })

  it('disables submitting again while the session is being created', async () => {
    const { createSession, user } = renderScreen(vi.fn(() => new Promise<string>(() => {})))

    await user.type(screen.getByLabelText('Challenge'), 'Why?')
    await user.click(screen.getByRole('button', { name: 'Create session' }))
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(screen.getByRole('button', { name: 'Create session' })).toBeDisabled()
    expect(createSession).toHaveBeenCalledTimes(1)
  })

  it('shows the error message when creating the session fails', async () => {
    const { onCreated, user } = renderScreen(vi.fn(async () => { throw new Error('challenge is too long') }))

    await user.type(screen.getByLabelText('Challenge'), 'Why?')
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('challenge is too long')
    expect(onCreated).not.toHaveBeenCalled()
  })
})
