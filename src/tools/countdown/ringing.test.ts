import { describe, expect, it } from 'vitest'
import type { CountdownItem } from '../../store/types.ts'
import { RING_LIMIT_MS, isRinging } from './ringing.ts'

const NOW = 1_760_000_000_000
const MIN = 60_000

const timer = (patch: Partial<CountdownItem>): CountdownItem => ({
  id: 't',
  label: 'Eggs',
  totalMs: 5 * MIN,
  ...patch,
})

describe('isRinging', () => {
  it('is silent while the timer still has time on it', () => {
    expect(isRinging(timer({ endAt: NOW + MIN }), NOW)).toBe(false)
  })

  it('is silent while the timer is paused', () => {
    expect(isRinging(timer({ pausedRemainingMs: MIN }), NOW)).toBe(false)
  })

  it('rings from the moment it hits zero', () => {
    expect(isRinging(timer({ endAt: NOW }), NOW)).toBe(true)
  })

  it('keeps ringing minutes later — nobody has come back yet', () => {
    expect(isRinging(timer({ endAt: NOW - 2 * MIN }), NOW)).toBe(true)
  })

  it('stops once it has been stopped', () => {
    expect(isRinging(timer({ endAt: NOW - MIN, silencedAt: NOW - 30_000 }), NOW)).toBe(false)
  })

  it('gives up at the end of the ring window', () => {
    // A timer that ran out while the tab was closed must not greet the next
    // visit with a siren.
    expect(isRinging(timer({ endAt: NOW - RING_LIMIT_MS + 1_000 }), NOW)).toBe(true)
    expect(isRinging(timer({ endAt: NOW - RING_LIMIT_MS }), NOW)).toBe(false)
  })
})
