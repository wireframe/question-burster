import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SessionView } from '../../shared/protocol'
import { buildView } from '../test-support'
import { Burst } from './Burst'

const burstView = buildView({
  phase: 'burst',
  participants: [
    { id: 'p1', name: 'Ada', done: false },
    { id: 'p2', name: 'Grace', done: true },
  ],
  myQuestions: [
    { id: 'q1', text: 'What slows us down?' },
    { id: 'q2', text: 'Who waits on whom?' },
  ],
})

interface RenderOptions {
  view?: SessionView
  secondsRemaining?: number
  participantId?: string
}

function renderBurst({ view = burstView, secondsRemaining = 125, participantId = 'p1' }: RenderOptions = {}) {
  const send = vi.fn()
  render(<Burst view={view} send={send} secondsRemaining={secondsRemaining} participantId={participantId} />)
  return { send, user: userEvent.setup() }
}

describe('Burst', () => {
  it('shows the viewer\'s own questions', () => {
    renderBurst()

    const myQuestions = screen.getByRole('list', { name: 'Your questions' })
    expect(within(myQuestions).getByText('What slows us down?')).toBeInTheDocument()
    expect(within(myQuestions).getByText('Who waits on whom?')).toBeInTheDocument()
  })

  it('submits a question on Enter and clears the input', async () => {
    const { send, user } = renderBurst()
    const input = screen.getByLabelText('Your question')

    await user.type(input, 'Why do reviews take days?{Enter}')

    expect(send).toHaveBeenCalledWith({ type: 'submitQuestion', text: 'Why do reviews take days?' })
    expect(input).toHaveValue('')
  })

  it('ignores blank submissions', async () => {
    const { send, user } = renderBurst()

    await user.type(screen.getByLabelText('Your question'), '   {Enter}')

    expect(send).not.toHaveBeenCalled()
  })

  it('disables the input when time is up', () => {
    renderBurst({ secondsRemaining: 0 })

    expect(screen.getByLabelText('Your question')).toBeDisabled()
  })

  it('marks the viewer done', async () => {
    const { send, user } = renderBurst()

    await user.click(screen.getByRole('button', { name: 'I\'m done' }))

    expect(send).toHaveBeenCalledWith({ type: 'markDone' })
  })

  it('hides I\'m done once the viewer is done', () => {
    renderBurst({ participantId: 'p2' })

    expect(screen.queryByRole('button', { name: 'I\'m done' })).not.toBeInTheDocument()
  })
})
