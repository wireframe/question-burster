import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkflowStepper } from './WorkflowStepper'

const BURST_HINT = 'Write as many questions as you can, at least 15. No answers, no explanations — just questions.'

function progressSteps() {
  return within(screen.getByRole('list', { name: 'Session progress' })).getAllByRole('listitem')
}

describe('WorkflowStepper', () => {
  it('lists every step of the session', () => {
    render(<WorkflowStepper phase="lobby" />)

    expect(progressSteps().map((step) => step.textContent)).toEqual([
      expect.stringContaining('Join'),
      expect.stringContaining('Burst'),
      expect.stringContaining('Consolidate'),
      expect.stringContaining('Vote'),
      expect.stringContaining('Results'),
    ])
  })

  it('marks only the current step with aria-current', () => {
    render(<WorkflowStepper phase="consolidate" />)

    const [, , consolidate, vote] = progressSteps()
    expect(consolidate).toHaveAttribute('aria-current', 'step')
    expect(vote).not.toHaveAttribute('aria-current')
  })

  it('marks steps before the current one as done', () => {
    render(<WorkflowStepper phase="vote" />)

    const [join, burst, consolidate, vote] = progressSteps()
    expect(within(join).getByLabelText('done')).toBeInTheDocument()
    expect(within(burst).getByLabelText('done')).toBeInTheDocument()
    expect(within(consolidate).getByLabelText('done')).toBeInTheDocument()
    expect(within(vote).queryByLabelText('done')).not.toBeInTheDocument()
  })

  it('describes the current step with its hint', () => {
    render(<WorkflowStepper phase="burst" />)

    const [, burst] = progressSteps()
    expect(burst).toHaveAccessibleDescription(BURST_HINT)
  })

  it('shows the hint and extra content in the current step callout', () => {
    render(<WorkflowStepper phase="burst"><button type="button">End burst</button></WorkflowStepper>)

    const callout = screen.getByRole('group', { name: 'Current step' })
    expect(within(callout).getByText(BURST_HINT)).toBeInTheDocument()
    expect(within(callout).getByRole('button', { name: 'End burst' })).toBeInTheDocument()
  })

  it('summarises progress for narrow screens', () => {
    render(<WorkflowStepper phase="vote" />)

    expect(screen.getByText('Step 4 of 5 · Vote')).toBeInTheDocument()
  })
})
