import { describe, expect, it } from 'vitest'
import { nextTrigger } from './alarm.ts'

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
    const trigger = nextTrigger(
      { time: '07:30', days: [2, 3, 4], enabled: true },
      MONDAY_8AM,
    )
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
