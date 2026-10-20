import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChallengeBanner } from './ChallengeBanner'

describe('ChallengeBanner', () => {
  it('labels the challenge and shows it as the page heading', () => {
    render(<ChallengeBanner challenge="How might we ship faster?" />)

    expect(screen.getByText('The challenge')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'How might we ship faster?' })).toBeInTheDocument()
  })
})
