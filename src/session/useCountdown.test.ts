import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 100_000 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down as time passes', () => {
    const { result } = renderHook(() => useCountdown(110_000, 0))
    expect(result.current).toBe(10)

    act(() => vi.advanceTimersByTime(3_000))

    expect(result.current).toBe(7)
  })

  it('reaches zero at the deadline', () => {
    const { result } = renderHook(() => useCountdown(110_000, 0))

    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current).toBe(0)
  })

  it('returns zero when there is no deadline', () => {
    expect(renderHook(() => useCountdown(null, 0)).result.current).toBe(0)
  })
})
