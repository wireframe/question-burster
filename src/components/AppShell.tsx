import type { ReactNode } from 'react'
import { LogoMark } from './LogoMark'
import { pageColumn } from './ui'

interface AppShellProps {
  showBrand: boolean
  children: ReactNode
}

export function AppShell({ showBrand, children }: AppShellProps) {
  return (
    <div className="min-h-screen pb-16">
      {showBrand && <AppHeader />}
      <main>{children}</main>
      <AppFooter />
    </div>
  )
}

function AppHeader() {
  return (
    <header className={`${pageColumn} flex items-center py-5 sm:py-6`}>
      <a href="/" className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <LogoMark />
        <span className="font-marker text-3xl leading-none font-bold text-ink">Question Burst</span>
      </a>
    </header>
  )
}

function AppFooter() {
  return (
    <footer className={`${pageColumn} pt-12 text-center text-sm text-ink-muted`}>
      Based on the Question Burst from Hal Gregersen's{' '}
      <a
        href="https://hbr.org/2018/03/better-brainstorming"
        className="font-semibold underline underline-offset-2 hover:text-accent"
      >
        "Better Brainstorming"
      </a>{' '}
      (Harvard Business Review, 2018).
    </footer>
  )
}
