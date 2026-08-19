import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider, useNow } from './useNow.tsx'

const probe = () => renderHook(() => useNow(), { wrapper: TickerProvider })

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('TickerProvider', () => {
  it('exposes the current time to children', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    const { result } = probe()
    expect(result.current).toBe(1_000_000)
  })

  it('refreshes on each tick — one interval for the whole app', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    const { result } = probe()

    // Advancing fake time also advances the mocked clock: the tick at +250ms
    // must read Date.now() === 1_000_250.
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current).toBe(1_000_250)
  })

  it('refreshes immediately when the tab becomes visible again', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    const { result } = probe()

    // A backgrounded tab: the interval is throttled, the clock is not.
    act(() => {
      vi.setSystemTime(1_005_000)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(1_005_000)
  })
})
