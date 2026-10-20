import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Lobby } from './Lobby'

const inviteUrl = 'https://burst.example/s/s1'

function renderLobby(copyText = vi.fn().mockResolvedValue(undefined)) {
  render(<Lobby inviteUrl={inviteUrl} copyText={copyText} />)
  return { copyText, user: userEvent.setup() }
}

describe('Lobby', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the session link to invite others', () => {
    renderLobby()

    expect(screen.getByRole('textbox', { name: 'Session link' })).toHaveValue(inviteUrl)
  })

  it('copies the session link', async () => {
    const { copyText, user } = renderLobby()

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(copyText).toHaveBeenCalledWith(inviteUrl)
  })

  it('confirms the copy briefly', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderLobby()

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy link' })))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2_000))
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
  })
})
