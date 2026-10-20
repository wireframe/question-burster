import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { GuidePanel } from './GuidePanel'

describe('GuidePanel', () => {
  it('keeps its tips collapsed until the title is clicked', async () => {
    const user = userEvent.setup()
    render(<GuidePanel title="What makes a good thing?" tips={['Keep it short.', 'Keep it open.']} />)

    expect(screen.getByText('Keep it short.')).not.toBeVisible()
    await user.click(screen.getByText('What makes a good thing?'))

    expect(screen.getByText('Keep it short.')).toBeVisible()
    expect(screen.getByText('Keep it open.')).toBeVisible()
  })
})
