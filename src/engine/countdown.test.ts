import { describe, expect, it } from 'vitest'
import { isDone, pause, progress, remainingMs, resume, start } from './countdown.ts'

const MIN = 60_000
const NOW = 1_000_000

describe('remainingMs', () => {
  it('derives from endAt while running', () => {
    expect(remainingMs({ totalMs: 5 * MIN, endAt: NOW + 90_000 }, NOW)).toBe(90_000)
  })

  it('clamps at zero once endAt has passed', () => {
    expect(remainingMs({ totalMs: 5 * MIN, endAt: NOW - 1 }, NOW)).toBe(0)
  })

  it('reads the frozen value while paused', () => {
    expect(remainingMs({ totalMs: 5 * MIN, pausedRemainingMs: 42_000 }, NOW + 999)).toBe(42_000)
  })

  it('shows the full duration before the first start', () => {
    expect(remainingMs({ totalMs: 5 * MIN }, NOW)).toBe(5 * MIN)
  })
})

describe('isDone', () => {
  it('is true only for a running timer at or past its endAt', () => {
    expect(isDone({ totalMs: MIN, endAt: NOW - 1 }, NOW)).toBe(true)
    // At the exact boundary the remaining time is zero: the timer has fired.
    expect(isDone({ totalMs: MIN, endAt: NOW }, NOW)).toBe(true)
    expect(isDone({ totalMs: MIN, endAt: NOW + 1 }, NOW)).toBe(false)
  })

  it('is false while paused or never started', () => {
    expect(isDone({ totalMs: MIN, pausedRemainingMs: 0 }, NOW)).toBe(false)
    expect(isDone({ totalMs: MIN }, NOW)).toBe(false)
  })
})

describe('progress', () => {
  it('is the elapsed fraction, zero to one', () => {
    const timer = { totalMs: 4 * MIN, endAt: NOW + MIN }
    expect(progress(timer, NOW - 3 * MIN)).toBe(0)
    expect(progress(timer, NOW)).toBe(0.75)
    expect(progress(timer, NOW + MIN)).toBe(1)
    expect(progress(timer, NOW + 2 * MIN)).toBe(1)
  })
})

describe('start / pause / resume', () => {
  it('start stamps endAt from totalMs', () => {
    const timer = start({ totalMs: 5 * MIN }, NOW)
    expect(timer.endAt).toBe(NOW + 5 * MIN)
    expect(timer.pausedRemainingMs).toBeUndefined()
  })

  it('pause freezes what is left', () => {
    const paused = pause({ totalMs: 5 * MIN, endAt: NOW + 90_000 }, NOW)
    expect(paused).toEqual({ totalMs: 5 * MIN, pausedRemainingMs: 90_000 })
  })

  it('pause is idempotent on an already-paused timer', () => {
    const paused = pause({ totalMs: 5 * MIN, pausedRemainingMs: 30_000 }, NOW + 500)
    expect(paused).toEqual({ totalMs: 5 * MIN, pausedRemainingMs: 30_000 })
  })

  it('resume re-stamps endAt from the frozen remainder', () => {
    const resumed = resume({ totalMs: 5 * MIN, pausedRemainingMs: 90_000 }, NOW)
    expect(resumed).toEqual({ totalMs: 5 * MIN, endAt: NOW + 90_000 })
  })

  it('a pause/resume round-trip survives wall-clock jumps', () => {
    const running = { totalMs: 10 * MIN, endAt: NOW + 8 * MIN }
    const paused = pause(running, NOW + 2 * MIN) // 6 min left
    const resumed = resume(paused, NOW + 60 * MIN) // an hour later
    expect(remainingMs(resumed, NOW + 60 * MIN)).toBe(6 * MIN)
  })
})
