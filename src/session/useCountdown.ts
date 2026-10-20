import { useEffect, useState } from 'react'
import { secondsRemaining } from './countdown'

const TICK_MS = 250

function useTickingNow(): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(interval)
  }, [])
  return now
}

export function useCountdown(endsAt: number | null, clockOffset: number): number {
  const now = useTickingNow()
  return endsAt == null ? 0 : secondsRemaining({ endsAt, clockOffset, now })
}
