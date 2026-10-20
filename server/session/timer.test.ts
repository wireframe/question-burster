import { describe, expect, it } from 'vitest'
import { buildSession } from './test-support'
import { BURST_GRACE_MS, burstTimeoutMs } from './timer'

describe('burstTimeoutMs', () => {
  it('returns null outside the burst', () => {
    expect(burstTimeoutMs(buildSession({ phase: 'consolidate', endsAt: 5000 }), 1000)).toBeNull()
  })

  it('returns the time left until the burst closes, including the grace window', () => {
    expect(burstTimeoutMs(buildSession({ phase: 'burst', endsAt: 5000 }), 1000)).toBe(4000 + BURST_GRACE_MS)
  })

  it('returns 0 once the burst has closed', () => {
    expect(burstTimeoutMs(buildSession({ phase: 'burst', endsAt: 5000 }), 5000 + BURST_GRACE_MS + 1)).toBe(0)
  })
})
