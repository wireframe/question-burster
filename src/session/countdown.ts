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

export type CountdownUrgency = 'calm' | 'warning' | 'critical'

const WARNING_BELOW_SECONDS = 30
const CRITICAL_BELOW_SECONDS = 10

export function countdownUrgency(secondsLeft: number): CountdownUrgency {
  if (secondsLeft < CRITICAL_BELOW_SECONDS) return 'critical'
  if (secondsLeft < WARNING_BELOW_SECONDS) return 'warning'
  return 'calm'
}
