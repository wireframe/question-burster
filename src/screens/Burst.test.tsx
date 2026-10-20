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
    { id: 'q1', text: 'What slows us down?', color: 0 },
    { id: 'q2', text: 'Who waits on whom?', color: 0 },
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

  it('shows progress toward the question goal', () => {
    renderBurst()

    expect(screen.getByText('2 of 15')).toBeInTheDocument()
  })

  it('says when the question goal is reached', () => {
    const questions = Array.from({ length: 15 }, (_, index) => ({ id: `q${index}`, text: `Why ${index}?`, color: 0 }))
    renderBurst({ view: { ...burstView, myQuestions: questions } })

    expect(screen.getByText('15 · goal reached')).toBeInTheDocument()
  })

  it('offers tips on what makes a good question', async () => {
    const { user } = renderBurst()

    await user.click(screen.getByText('What makes a good question?'))

    expect(screen.getByText('Surprising and provocative questions are welcome.')).toBeVisible()
  })

  it('nudges toward a question mark without blocking the submission', async () => {
    const { send, user } = renderBurst()
    const input = screen.getByLabelText('Your question')

    await user.type(input, 'Reviews take days')

    expect(input).toHaveAccessibleDescription('Questions end with a “?”. Press Enter to add it anyway.')
    await user.type(input, '{Enter}')
    expect(send).toHaveBeenCalledWith({ type: 'submitQuestion', text: 'Reviews take days' })
  })

  it('explains how to add a question once it ends with a question mark', async () => {
    const { user } = renderBurst()
    const input = screen.getByLabelText('Your question')

    await user.type(input, 'Why do reviews take days?')

    expect(input).toHaveAccessibleDescription('Press Enter to add it to the wall.')
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
