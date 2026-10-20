import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildView } from '../test-support'
import { Placeholder } from './Placeholder'

describe('Placeholder', () => {
  it('shows the current phase', () => {
    render(<Placeholder view={buildView({ phase: 'vote' })} send={vi.fn()} />)

    expect(screen.getByText('Phase: vote')).toBeInTheDocument()
  })

  it('advances from the current phase', async () => {
    const send = vi.fn()
    render(<Placeholder view={buildView({ phase: 'consolidate' })} send={send} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Next phase →' }))

    expect(send).toHaveBeenCalledWith({ type: 'advance', fromPhase: 'consolidate' })
  })

  it('offers no advance from the final phase', () => {
    render(<Placeholder view={buildView({ phase: 'results' })} send={vi.fn()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
