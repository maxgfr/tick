import { describe, expect, it } from 'vitest'
import { nextTrigger, lastTrigger } from './alarm.ts'

// Monday 2026-08-17, 08:00 local (jsdom runs in the host timezone; pin instants
// relative to a Monday so day-of-week math is deterministic).
const MONDAY_8AM = new Date(2026, 7, 17, 8, 0, 0, 0)
const MONDAY_630AM = new Date(2026, 7, 17, 6, 30, 0, 0)
const NEXT_MONDAY_730 = new Date(2026, 7, 24, 7, 30, 0, 0)
const TUESDAY_730 = new Date(2026, 7, 18, 7, 30, 0, 0)

describe('nextTrigger', () => {
  it('fires later today when the time is still ahead', () => {
    const trigger = nextTrigger({ time: '09:30', days: [], enabled: true }, MONDAY_8AM)
    expect(trigger).toEqual(new Date(2026, 7, 17, 9, 30).getTime())
  })

  it('rolls to tomorrow once today time has passed', () => {
    const trigger = nextTrigger({ time: '07:30', days: [], enabled: true }, MONDAY_8AM)
    expect(trigger).toBe(TUESDAY_730.getTime())
  })

  it('fires today before the alarm time, not after', () => {
    const trigger = nextTrigger({ time: '07:30', days: [], enabled: true }, MONDAY_630AM)
    expect(trigger).toBe(new Date(2026, 7, 17, 7, 30).getTime())
  })

  it('wraps the week to the next enabled day', () => {
    // Monday 08:00, alarm only on Mondays at 07:30 → next Monday.
    const trigger = nextTrigger({ time: '07:30', days: [1], enabled: true }, MONDAY_8AM)
    expect(trigger).toBe(NEXT_MONDAY_730.getTime())
  })

  it('lands on today when the enabled day has not passed the time', () => {
    const trigger = nextTrigger({ time: '09:00', days: [1], enabled: true }, MONDAY_8AM)
    expect(trigger).toBe(new Date(2026, 7, 17, 9, 0).getTime())
  })

  it('skips disabled days', () => {
    // Enabled Tue/Wed/Thu; from Monday 08:00 at 07:30 → Tuesday.
    const trigger = nextTrigger({ time: '07:30', days: [2, 3, 4], enabled: true }, MONDAY_8AM)
    expect(trigger).toBe(TUESDAY_730.getTime())
  })

  it('never fires a disabled alarm', () => {
    expect(nextTrigger({ time: '09:30', days: [], enabled: false }, MONDAY_8AM)).toBeNull()
  })

  it('rejects a malformed time', () => {
    expect(nextTrigger({ time: '9', days: [], enabled: true }, MONDAY_8AM)).toBeNull()
    expect(nextTrigger({ time: '25:00', days: [], enabled: true }, MONDAY_8AM)).toBeNull()
    expect(nextTrigger({ time: '12:60', days: [], enabled: true }, MONDAY_8AM)).toBeNull()
  })
})

describe('lastTrigger', () => {
  // Wednesday 2025-10-08T08:00:00 local.
  const now = new Date(2025, 9, 8, 8, 0, 0, 0)
  const config = { time: '07:30', days: [], enabled: true }

  it('finds today’s occurrence when it has already passed', () => {
    const last = lastTrigger(config, now)
    expect(last).not.toBeNull()
    expect(new Date(last!).getHours()).toBe(7)
    expect(new Date(last!).getMinutes()).toBe(30)
    expect(new Date(last!).getDate()).toBe(8)
  })

  it('falls back to the previous day when today’s has not rung yet', () => {
    const early = new Date(2025, 9, 8, 6, 0, 0, 0)
    const last = lastTrigger(config, early)
    expect(new Date(last!).getDate()).toBe(7)
  })

  it('scans back to the latest enabled weekday', () => {
    const mondays = { time: '07:30', days: [1], enabled: true }
    const last = lastTrigger(mondays, now)
    expect(last).not.toBeNull()
    expect(new Date(last!).getDate()).toBe(6) // Monday 2025-10-06
  })

  it('returns null when disabled or malformed', () => {
    expect(lastTrigger({ ...config, enabled: false }, now)).toBeNull()
    expect(lastTrigger({ ...config, time: '9:99' }, now)).toBeNull()
  })
})
