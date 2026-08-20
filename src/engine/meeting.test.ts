import { describe, expect, it } from 'vitest'
import {
  availabilityAt,
  bestWindows,
  buildGrid,
  convert,
  daysBetween,
  decodeMeeting,
  encodeMeeting,
  formatSummary,
  shiftDay,
  todayInZone,
  type MeetingParticipant,
} from './meeting.ts'
import { zonedTimeToInstant } from './timezones.ts'

const person = (
  id: string,
  zoneId: string,
  startMin = 9 * 60,
  endMin = 17 * 60,
): MeetingParticipant => ({ id, label: id, zoneId, startMin, endMin })

/** The instant a zone's wall clock reads this time on this day. */
const at = (zoneId: string, day: string, hour: number, minute = 0): number => {
  const [year, month, date] = day.split('-').map(Number)
  return zonedTimeToInstant(zoneId, { year: year!, month: month!, day: date!, hour, minute })
}

describe('availabilityAt', () => {
  const paris = person('p', 'Europe/Paris')

  it('classifies by the participant own local clock', () => {
    expect(availabilityAt(paris, at('Europe/Paris', '2026-05-06', 9), 30)).toBe('working')
    expect(availabilityAt(paris, at('Europe/Paris', '2026-05-06', 16, 30), 30)).toBe('working')
    expect(availabilityAt(paris, at('Europe/Paris', '2026-05-06', 3), 30)).toBe('off')
  })

  it('judges the whole span, not just when it starts', () => {
    // 16:00 is inside 09:00–17:00, but a two-hour meeting is not.
    const start = at('Europe/Paris', '2026-05-06', 16)
    expect(availabilityAt(paris, start, 30)).toBe('working')
    expect(availabilityAt(paris, start, 120)).toBe('fringe')
    expect(availabilityAt(paris, start, 300)).toBe('off')
  })

  it('marks the hour either side as a stretch, and further out as off', () => {
    expect(availabilityAt(paris, at('Europe/Paris', '2026-05-06', 8), 30)).toBe('fringe')
    expect(availabilityAt(paris, at('Europe/Paris', '2026-05-06', 17), 30)).toBe('fringe')
    expect(availabilityAt(paris, at('Europe/Paris', '2026-05-06', 7), 30)).toBe('off')
    expect(availabilityAt(paris, at('Europe/Paris', '2026-05-06', 18, 30), 30)).toBe('off')
  })

  it('never lets a span cross the participant local midnight', () => {
    const night = person('n', 'Europe/Paris', 0, 24 * 60)
    expect(availabilityAt(night, at('Europe/Paris', '2026-05-06', 23, 30), 60)).toBe('off')
  })
})

describe('buildGrid', () => {
  const roster = [person('paris', 'Europe/Paris'), person('ny', 'America/New_York')]

  it('covers an ordinary civil day in half-hour slots', () => {
    const grid = buildGrid(roster, '2026-05-06', 30)
    expect(grid.slots).toHaveLength(48)
    expect(grid.slots[0]?.anchorTime).toBe('00:00')
    expect(grid.slots.at(-1)?.anchorTime).toBe('23:30')
  })

  it('is 46 slots on the spring-forward day, with no 02:00 label', () => {
    // Europe changes on 2026-03-29: the clock jumps 02:00 to 03:00, so that
    // civil day is 23 hours long. A fixed 48-slot grid would print an hour
    // that never happened.
    const grid = buildGrid([person('paris', 'Europe/Paris')], '2026-03-29', 30)
    expect(grid.slots).toHaveLength(46)
    expect(grid.slots.map((slot) => slot.anchorTime)).not.toContain('02:00')
    expect(grid.slots.map((slot) => slot.anchorTime)).not.toContain('02:30')
  })

  it('is 50 slots on the fall-back day, with 02:00 appearing twice', () => {
    const grid = buildGrid([person('paris', 'Europe/Paris')], '2026-10-25', 30)
    expect(grid.slots).toHaveLength(50)
    const twos = grid.slots.filter((slot) => slot.anchorTime === '02:00')
    expect(twos).toHaveLength(2)
  })

  it('does not cache an offset — the same wall clock maps differently in March', () => {
    // The US springs forward on 2026-03-08, Europe on 2026-03-29. For the
    // three weeks between, Paris→New York is five hours, not six. Any
    // implementation that stores one offset gets this fortnight wrong.
    const before = buildGrid(roster, '2026-03-01', 30)
    const during = buildGrid(roster, '2026-03-15', 30)

    const nyAt = (grid: ReturnType<typeof buildGrid>, anchorTime: string): string | undefined =>
      grid.slots.find((slot) => slot.anchorTime === anchorTime)?.participants[1]?.time

    expect(nyAt(before, '14:00')).toBe('08:00')
    expect(nyAt(during, '14:00')).toBe('09:00')
  })

  it('reports the day each participant is on', () => {
    const wide = [
      person('paris', 'Europe/Paris'),
      person('tokyo', 'Asia/Tokyo'),
      person('la', 'America/Los_Angeles'),
    ]
    const grid = buildGrid(wide, '2026-05-06', 30)

    const evening = grid.slots.find((slot) => slot.anchorTime === '20:00')!
    expect(evening.participants[1]?.dayOffset).toBe(1)

    const earlyMorning = grid.slots.find((slot) => slot.anchorTime === '02:00')!
    expect(earlyMorning.participants[2]?.dayOffset).toBe(-1)
  })

  it('grades the verdict instead of answering yes or no', () => {
    const grid = buildGrid(roster, '2026-05-06', 30)
    const verdicts = new Set(grid.slots.map((slot) => slot.verdict))
    expect(verdicts.has('all')).toBe(true)
    expect(verdicts.has('stretch')).toBe(true)
    expect(verdicts.has('none')).toBe(true)

    // Paris 15:00 is New York 09:00: everyone is working.
    expect(grid.slots.find((slot) => slot.anchorTime === '15:00')?.verdict).toBe('all')
    // Paris 03:00 is nobody's working hour.
    expect(grid.slots.find((slot) => slot.anchorTime === '03:00')?.verdict).toBe('none')
  })

  it('returns nothing for an empty roster or a malformed day, and never throws', () => {
    expect(buildGrid([], '2026-05-06', 30).slots).toEqual([])
    expect(buildGrid([person('p', 'Europe/Paris')], 'not-a-day', 30).slots).toEqual([])
  })
})

describe('bestWindows', () => {
  it('merges contiguous slots into one range, best first', () => {
    const grid = buildGrid(
      [person('paris', 'Europe/Paris'), person('ny', 'America/New_York')],
      '2026-05-06',
      30,
    )
    const windows = bestWindows(grid, 3)

    expect(windows.length).toBeGreaterThan(0)
    expect(windows[0]?.verdict).toBe('all')
    // A merged range, not a half-hour crumb.
    expect(windows[0]!.endMs - windows[0]!.startMs).toBeGreaterThan(30 * 60_000)
  })

  it('keeps the perfect window separate from the wider stretched one', () => {
    const grid = buildGrid(
      [person('paris', 'Europe/Paris'), person('ny', 'America/New_York')],
      '2026-05-06',
      30,
    )
    const windows = bestWindows(grid, 5)

    // Merging everything workable into one run and keeping the weaker verdict
    // would swallow the perfect window inside a longer stretched one — the
    // best answer lost inside the compromise.
    const best = windows[0]!
    expect(best.verdict).toBe('all')
    const stretched = windows.find((w) => w.verdict === 'stretch')!
    expect(stretched.startMs).toBeLessThan(best.startMs)
    expect(stretched.endMs).toBeGreaterThan(best.endMs)
  })

  it('returns nothing for a roster that genuinely cannot meet', () => {
    // London and Auckland in May are eleven hours apart: two ten-hour askable
    // bands that never touch. The view needs that empty answer rather than a
    // fabricated one.
    const grid = buildGrid(
      [person('lon', 'Europe/London'), person('akl', 'Pacific/Auckland')],
      '2026-05-06',
      30,
    )
    expect(bestWindows(grid, 3)).toEqual([])
  })
})

describe('convert', () => {
  it('renders one instant in everyone local terms, with the day marker', () => {
    const instant = at('Europe/Paris', '2026-05-06', 20)
    const rows = convert(
      [
        person('paris', 'Europe/Paris'),
        person('tokyo', 'Asia/Tokyo'),
        person('ny', 'America/New_York'),
      ],
      instant,
      30,
    )

    expect(rows[0]?.time).toBe('20:00')
    expect(rows[1]?.time).toBe('03:00')
    expect(rows[1]?.dayOffset).toBe(1)
    expect(rows[2]?.time).toBe('14:00')
    expect(rows[2]?.dayOffset).toBe(0)
  })

  it('is exact for a half-hour zone', () => {
    const instant = at('Europe/Paris', '2026-05-06', 14)
    const rows = convert(
      [person('paris', 'Europe/Paris'), person('in', 'Asia/Kolkata')],
      instant,
      30,
    )
    expect(rows[1]?.time).toBe('17:30')
  })
})

describe('formatSummary', () => {
  it('names every participant with their local time and day marker', () => {
    const instant = at('Europe/Paris', '2026-05-06', 20)
    const text = formatSummary(
      [person('Alice', 'Europe/Paris'), person('Kenji', 'Asia/Tokyo')],
      instant,
      45,
    )

    expect(text).toContain('45 min')
    expect(text).toContain('Wed 6 May 2026')
    expect(text).toContain('Alice')
    expect(text).toContain('20:00')
    expect(text).toContain('03:00 +1d')
  })

  it('falls back to the city when a label is blank, and takes a title', () => {
    const instant = at('Europe/Paris', '2026-05-06', 10)
    const text = formatSummary(
      [{ id: 'a', label: '  ', zoneId: 'America/Sao_Paulo', startMin: 540, endMin: 1020 }],
      instant,
      30,
      { title: 'Standup' },
    )
    expect(text).toContain('Standup')
    expect(text).toContain('Sao Paulo')
  })

  it('has no clock inside — the same arguments always give the same text', () => {
    const instant = at('Europe/Paris', '2026-05-06', 10)
    const roster = [person('a', 'Europe/Paris')]
    expect(formatSummary(roster, instant, 30)).toBe(formatSummary(roster, instant, 30))
  })

  it('returns an empty string for an empty roster', () => {
    expect(formatSummary([], 0, 30)).toBe('')
  })
})

describe('encodeMeeting / decodeMeeting', () => {
  const payload = {
    v: 1 as const,
    durationMin: 45,
    participants: [
      person('a', 'Europe/Paris'),
      {
        id: 'b',
        label: 'São Paulo — Café ☕',
        zoneId: 'America/Sao_Paulo',
        startMin: 600,
        endMin: 1080,
      },
    ],
  }

  it('round-trips, non-ASCII labels included', () => {
    const decoded = decodeMeeting(encodeMeeting(payload))
    expect(decoded?.durationMin).toBe(45)
    expect(decoded?.participants).toHaveLength(2)
    expect(decoded?.participants[1]?.label).toBe('São Paulo — Café ☕')
    expect(decoded?.participants[1]?.zoneId).toBe('America/Sao_Paulo')
    expect(decoded?.participants[0]?.startMin).toBe(540)
  })

  it('carries a pinned instant when there is one', () => {
    const instant = at('Europe/Paris', '2026-05-06', 14)
    const decoded = decodeMeeting(encodeMeeting({ ...payload, atMs: instant }))
    expect(decoded?.atMs).toBe(instant)
  })

  it('produces a URL-safe string with no padding', () => {
    expect(encodeMeeting(payload)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('refuses anything it cannot vouch for, rather than throwing', () => {
    const bad = [
      '',
      'not base64!!',
      btoa('plain text').replaceAll('=', ''),
      encodeMeeting({ ...payload, durationMin: 9_000 }),
      // An unknown zone id.
      btoa(
        encodeURIComponent(JSON.stringify({ v: 1, d: 30, p: [['Mars/Olympus', '', 540, 1020]] })),
      )
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', ''),
      // Working hours the wrong way round.
      btoa(encodeURIComponent(JSON.stringify({ v: 1, d: 30, p: [['UTC', '', 1020, 540]] })))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', ''),
      // Nine participants.
      encodeMeeting({
        v: 1,
        durationMin: 30,
        participants: Array.from({ length: 9 }, (_, i) => person(`p${String(i)}`, 'UTC')),
      }),
    ]
    for (const encoded of bad) {
      expect(() => decodeMeeting(encoded)).not.toThrow()
      expect(decodeMeeting(encoded)).toBeNull()
    }
  })
})

describe('civil date helpers', () => {
  it('shifts a day across a month and a year boundary', () => {
    expect(shiftDay('2026-05-06', 1)).toBe('2026-05-07')
    expect(shiftDay('2026-05-31', 1)).toBe('2026-06-01')
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDay('nonsense', 1)).toBe('nonsense')
  })

  it('counts whole civil days, immune to daylight saving', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-05-06', '2026-05-05')).toBe(-1)
    expect(daysBetween('2026-05-06', '2026-05-06')).toBe(0)
  })

  it('reads today in the zone that is asked, not the machine one', () => {
    // 2026-05-06 22:00 UTC is already the 7th in Tokyo.
    const instant = Date.UTC(2026, 4, 6, 22, 0)
    expect(todayInZone('Asia/Tokyo', instant)).toBe('2026-05-07')
    expect(todayInZone('America/Los_Angeles', instant)).toBe('2026-05-06')
  })
})
