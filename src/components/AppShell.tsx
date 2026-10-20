import type { ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16 sm:px-6">
      <AppHeader />
      <main>{children}</main>
    </div>
  )
}

function AppHeader() {
  return (
    <header className="flex items-center py-5 sm:py-6">
      <a href="/" className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <LogoMark />
        <span className="font-marker text-3xl leading-none font-bold text-ink">Question Burst</span>
      </a>
    </header>
  )
}

function LogoMark() {
  return (
    <span aria-hidden="true" className="flex size-9 -rotate-6 items-center justify-center rounded-md bg-note-yellow text-xl font-bold text-accent shadow-note motion-reduce:rotate-0">
      ?
    </span>
  )
}
