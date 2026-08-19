import { describe, expect, it } from 'vitest'
import { CURATED_ZONES, offsetMs, zonedParts } from './timezones.ts'

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
