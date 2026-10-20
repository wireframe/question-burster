interface CountdownMoment {
  endsAt: number
  clockOffset: number
  now: number
}

export function secondsRemaining({ endsAt, clockOffset, now }: CountdownMoment): number {
  return Math.max(0, Math.ceil((endsAt - (now + clockOffset)) / 1000))
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
