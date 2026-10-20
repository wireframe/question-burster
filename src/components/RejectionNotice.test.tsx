import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RejectionNotice } from './RejectionNotice'

describe('RejectionNotice', () => {
  it('shows the rejection as an alert', () => {
    render(<RejectionNotice message="Groups changed" onDismiss={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Groups changed')
  })

  it('calls onDismiss when Dismiss is clicked', async () => {
    const onDismiss = vi.fn()
    render(<RejectionNotice message="Groups changed" onDismiss={onDismiss} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onDismiss).toHaveBeenCalled()
  })
})
