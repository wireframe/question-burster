const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const buttonBase = `inline-flex items-center justify-center gap-2 font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${focusRing}`

export const primaryButton = `${buttonBase} rounded-full bg-accent px-6 py-3 text-white shadow-card hover:bg-accent-strong disabled:bg-accent/40 disabled:shadow-none`

export const secondaryButton = `${buttonBase} rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink hover:border-accent hover:text-accent disabled:text-ink-muted/60 disabled:hover:border-line`

export const ghostButton = `${buttonBase} rounded-full px-3 py-1 text-sm text-ink-muted hover:bg-accent-soft hover:text-accent`

export const roundButton = `${buttonBase} size-9 rounded-full border border-line bg-surface text-lg text-ink hover:border-accent hover:text-accent disabled:text-ink-muted/40 disabled:hover:border-line disabled:hover:text-ink-muted/40`

export const card = 'rounded-card border border-line bg-surface p-5 shadow-card sm:p-6'

export const fieldLabel = 'block text-sm font-semibold text-ink'

export const textField = `block w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-muted/70 focus:border-accent disabled:bg-paper disabled:text-ink-muted ${focusRing}`

export const sectionTitle = 'text-sm font-semibold uppercase tracking-wide text-ink-muted'

export const actionBar = 'flex flex-wrap items-center justify-end gap-3 pt-2'
