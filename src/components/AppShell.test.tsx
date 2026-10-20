import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it.each([true, false])('credits the HBR article in the footer when showBrand is %s', (showBrand) => {
    render(<AppShell showBrand={showBrand}>content</AppShell>)

    const link = screen.getByRole('link', { name: /Better Brainstorming/ })

    expect(link).toHaveAttribute('href', 'https://hbr.org/2018/03/better-brainstorming')
    expect(screen.getByRole('contentinfo')).toContainElement(link)
  })
})
