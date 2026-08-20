import { describe, expect, it } from 'vitest'
import {
  CURATED_ZONES,
  isKnownZone,
  offsetMs,
  zonedParts,
  zonedTimeToInstant,
} from './timezones.ts'

describe('zonedParts', () => {
  it('splits an instant into wall-clock parts for a zone', () => {
    const instant = new Date('2026-08-19T12:00:00Z')
    expect(zonedParts('Europe/Paris', instant)).toMatchObject({
      year: 2026,
      month: 8,
      day: 19,
      hour: 14,
      minute: 0,
      weekday: 3, // Wednesday
    })
    expect(zonedParts('America/New_York', instant)).toMatchObject({ hour: 8, day: 19 })
    expect(zonedParts('Asia/Tokyo', instant)).toMatchObject({ hour: 21, day: 19 })
    expect(zonedParts('Pacific/Kiritimati', instant)).toMatchObject({ hour: 2, day: 20 })
  })

  it('rolls the day across the antimeridian', () => {
    const instant = new Date('2026-08-19T23:30:00Z')
    expect(zonedParts('America/Los_Angeles', instant)).toMatchObject({ day: 19, hour: 16 })
    expect(zonedParts('Pacific/Auckland', instant)).toMatchObject({ day: 20, hour: 11 })
  })
})

describe('offsetMs', () => {
  it('returns the zone offset from UTC', () => {
    const instant = new Date('2026-08-19T12:00:00Z')
    expect(offsetMs('Europe/Paris', instant)).toBe(2 * 3_600_000)
    expect(offsetMs('America/New_York', instant)).toBe(-4 * 3_600_000)
    expect(offsetMs('Asia/Kolkata', instant)).toBe(5.5 * 3_600_000)
    expect(offsetMs('UTC', instant)).toBe(0)
  })

  it('jumps across the spring DST boundary in Paris', () => {
    // 2026-03-29: Paris switches to summer time at 01:00 UTC.
    const before = new Date('2026-03-29T00:30:00Z')
    const after = new Date('2026-03-29T01:30:00Z')
    expect(offsetMs('Europe/Paris', before)).toBe(3_600_000)
    expect(offsetMs('Europe/Paris', after)).toBe(7_200_000)
    expect(zonedParts('Europe/Paris', after)).toMatchObject({ hour: 3, minute: 30 })
  })

  it('repeats the wall-clock hour across the autumn DST boundary', () => {
    // 2026-10-25: Paris returns to winter time at 01:00 UTC; 02:30 happens twice.
    const before = new Date('2026-10-25T00:30:00Z')
    const after = new Date('2026-10-25T01:30:00Z')
    expect(offsetMs('Europe/Paris', before)).toBe(7_200_000)
    expect(offsetMs('Europe/Paris', after)).toBe(3_600_000)
    expect(zonedParts('Europe/Paris', after)).toMatchObject({ hour: 2, minute: 30 })
  })
})

describe('CURATED_ZONES', () => {
  it('groups valid, unique, well-known zones', () => {
    const ids = CURATED_ZONES.flatMap((group) => group.zones.map((zone) => zone.id))
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('Europe/Paris')
    expect(ids).toContain('America/New_York')
    expect(ids).toContain('Asia/Tokyo')
    expect(ids).toContain('UTC')

    for (const id of ids) {
      // An invalid id throws here; the picker must never offer one.
      offsetMs(id, new Date('2026-08-19T12:00:00Z'))
    }
  })

  it('labels every zone with a city', () => {
    for (const group of CURATED_ZONES) {
      for (const zone of group.zones) {
        expect(zone.city.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('zonedTimeToInstant', () => {
  it('round-trips through zonedParts across zones and seasons', () => {
    const cases: [
      string,
      { year: number; month: number; day: number; hour: number; minute: number },
    ][] = [
      ['Europe/Paris', { year: 2026, month: 1, day: 15, hour: 9, minute: 0 }],
      ['Europe/Paris', { year: 2026, month: 7, day: 15, hour: 9, minute: 0 }],
      ['America/New_York', { year: 2026, month: 3, day: 1, hour: 14, minute: 30 }],
      ['Asia/Tokyo', { year: 2026, month: 12, day: 31, hour: 23, minute: 59 }],
      ['Pacific/Auckland', { year: 2026, month: 6, day: 1, hour: 0, minute: 0 }],
      ['UTC', { year: 2026, month: 2, day: 28, hour: 12, minute: 0 }],
    ]

    for (const [zone, wall] of cases) {
      const back = zonedParts(zone, new Date(zonedTimeToInstant(zone, wall)))
      expect([back.year, back.month, back.day, back.hour, back.minute]).toEqual([
        wall.year,
        wall.month,
        wall.day,
        wall.hour,
        wall.minute,
      ])
    }
  })

  it('resolves a half-hour zone exactly', () => {
    // Kolkata is +5:30 — an offset that a whole-hour shortcut gets wrong.
    const at = zonedTimeToInstant('Asia/Kolkata', { year: 2026, month: 5, day: 4, hour: 9 })
    const back = zonedParts('Asia/Kolkata', new Date(at))
    expect([back.hour, back.minute]).toEqual([9, 0])
    expect(offsetMs('Asia/Kolkata', new Date(at))).toBe(5.5 * 3_600_000)
  })

  it('places Paris local midnight an hour before UTC midnight in summer', () => {
    const at = zonedTimeToInstant('Europe/Paris', { year: 2026, month: 6, day: 15 })
    expect(new Date(at).toISOString()).toBe('2026-06-14T22:00:00.000Z')
  })

  it('lands inside the spring-forward gap rather than throwing or drifting a day', () => {
    // 02:30 on the EU changeover does not exist; the clock jumps 02:00 → 03:00.
    const at = zonedTimeToInstant('Europe/Paris', {
      year: 2026,
      month: 3,
      day: 29,
      hour: 2,
      minute: 30,
    })
    const back = zonedParts('Europe/Paris', new Date(at))
    expect(back.day).toBe(29)
    // Whatever the engine reports, it must be a real instant on the right day
    // and after the transition — never 02:30, which never happened.
    expect(back.hour).toBe(3)
  })

  it('takes the earlier of the two readings in a fall-back overlap', () => {
    // 02:30 happens twice on 2026-10-25; the first is still at +02:00.
    const at = zonedTimeToInstant('Europe/Paris', {
      year: 2026,
      month: 10,
      day: 25,
      hour: 2,
      minute: 30,
    })
    expect(offsetMs('Europe/Paris', new Date(at))).toBe(2 * 3_600_000)
  })
})

describe('isKnownZone', () => {
  it('accepts every curated zone', () => {
    for (const group of CURATED_ZONES) {
      for (const zone of group.zones) expect(isKnownZone(zone.id)).toBe(true)
    }
  })

  it('rejects made-up ids without throwing', () => {
    expect(isKnownZone('Mars/Olympus')).toBe(false)
    expect(isKnownZone('')).toBe(false)
  })
})
