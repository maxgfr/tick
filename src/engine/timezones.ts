/**
 * Timezone math, on the platform's own tables.
 *
 * No library: `Intl.DateTimeFormat` with `timeZone` carries the IANA database
 * the browser ships, DST rules included. Offsets are derived, never stored —
 * the same instant always answers consistently.
 */
export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 (Sunday) to 6 (Saturday), matching Date#getDay. */
  weekday: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const formatter = (timeZone: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  })

export function zonedParts(timeZone: string, date: Date): ZonedParts {
  const parts = formatter(timeZone).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  const weekday = WEEKDAYS.indexOf(get('weekday').slice(0, 3))
  // hour '24' appears for midnight in some engines with hour12: false.
  const hour = Number(get('hour')) % 24

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday,
  }
}

/** The zone's offset from UTC at that instant, minute-exact. */
export function offsetMs(timeZone: string, date: Date): number {
  const parts = zonedParts(timeZone, date)
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  // formatToParts works at second precision; round away the milliseconds.
  return Math.round((asUTC - date.getTime()) / 60_000) * 60_000
}

/**
 * The inverse of `zonedParts`: the instant at which a zone's wall clock reads
 * these parts.
 *
 * Two passes, because the offset you need is the offset *at the answer*, not
 * at the guess. Guess by treating the wall clock as UTC, subtract the offset
 * there, then re-read the offset at that instant and correct once if the
 * first guess landed on the other side of a transition.
 *
 * Around a DST change the wall clock is not a bijection, so the edges are
 * defined rather than left to chance: in a spring-forward gap (a local time
 * that never happens) this returns the first instant at or after it, and in a
 * fall-back overlap (a local time that happens twice) it returns the earlier.
 */
export function zonedTimeToInstant(
  timeZone: string,
  parts: { year: number; month: number; day: number; hour?: number; minute?: number },
): number {
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour ?? 0, parts.minute ?? 0)

  // Probe half a day either side, so both offsets in play around a transition
  // are on the table. Correcting a single guess cannot find the *first* of two
  // identical wall clocks: both passes converge on the offset after the change.
  const HALF_DAY = 12 * 3_600_000
  const candidates = [
    asUTC - offsetMs(timeZone, new Date(asUTC - HALF_DAY)),
    asUTC - offsetMs(timeZone, new Date(asUTC + HALF_DAY)),
  ]

  const reads = (instant: number): boolean => {
    const back = zonedParts(timeZone, new Date(instant))
    return (
      back.year === parts.year &&
      back.month === parts.month &&
      back.day === parts.day &&
      back.hour === (parts.hour ?? 0) &&
      back.minute === (parts.minute ?? 0)
    )
  }

  const valid = candidates.filter(reads)
  // An overlap has two answers — take the earlier, the first time the clock
  // reads this. A gap has none: the wall clock never happens, so return the
  // instant just past the jump rather than a time that does not exist.
  return valid.length > 0 ? Math.min(...valid) : Math.max(...candidates)
}

/** True when the zone id is one the platform's timezone tables recognise. */
export function isKnownZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

export interface ZoneOption {
  id: string
  city: string
}

export interface ZoneGroup {
  region: string
  zones: readonly ZoneOption[]
}

/**
 * The zones a person actually reaches for, grouped the way the picker shows
 * them. `Intl.supportedValuesOf('timeZone')` exists, but a curated list keeps
 * the picker a dozen taps, not a thousand.
 */
export const CURATED_ZONES: readonly ZoneGroup[] = [
  {
    region: 'Europe',
    zones: [
      { id: 'Europe/Paris', city: 'Paris' },
      { id: 'Europe/London', city: 'London' },
      { id: 'Europe/Lisbon', city: 'Lisbon' },
      { id: 'Europe/Madrid', city: 'Madrid' },
      { id: 'Europe/Berlin', city: 'Berlin' },
      { id: 'Europe/Rome', city: 'Rome' },
      { id: 'Europe/Amsterdam', city: 'Amsterdam' },
      { id: 'Europe/Brussels', city: 'Brussels' },
      { id: 'Europe/Zurich', city: 'Zurich' },
      { id: 'Europe/Stockholm', city: 'Stockholm' },
      { id: 'Europe/Warsaw', city: 'Warsaw' },
      { id: 'Europe/Athens', city: 'Athens' },
      { id: 'Europe/Helsinki', city: 'Helsinki' },
      { id: 'Europe/Kyiv', city: 'Kyiv' },
      { id: 'Europe/Istanbul', city: 'Istanbul' },
      { id: 'Europe/Moscow', city: 'Moscow' },
      { id: 'Atlantic/Azores', city: 'Azores' },
    ],
  },
  {
    region: 'Americas',
    zones: [
      { id: 'America/New_York', city: 'New York' },
      { id: 'America/Toronto', city: 'Toronto' },
      { id: 'America/Chicago', city: 'Chicago' },
      { id: 'America/Denver', city: 'Denver' },
      { id: 'America/Mexico_City', city: 'Mexico City' },
      { id: 'America/Phoenix', city: 'Phoenix' },
      { id: 'America/Los_Angeles', city: 'Los Angeles' },
      { id: 'America/Vancouver', city: 'Vancouver' },
      { id: 'America/Anchorage', city: 'Anchorage' },
      { id: 'America/Bogota', city: 'Bogota' },
      { id: 'America/Lima', city: 'Lima' },
      { id: 'America/Santiago', city: 'Santiago' },
      { id: 'America/Sao_Paulo', city: 'São Paulo' },
      { id: 'America/Buenos_Aires', city: 'Buenos Aires' },
      { id: 'Pacific/Honolulu', city: 'Honolulu' },
    ],
  },
  {
    region: 'Asia & Middle East',
    zones: [
      { id: 'Asia/Dubai', city: 'Dubai' },
      { id: 'Asia/Tehran', city: 'Tehran' },
      { id: 'Asia/Karachi', city: 'Karachi' },
      { id: 'Asia/Kolkata', city: 'Mumbai & Delhi' },
      { id: 'Asia/Dhaka', city: 'Dhaka' },
      { id: 'Asia/Bangkok', city: 'Bangkok' },
      { id: 'Asia/Jakarta', city: 'Jakarta' },
      { id: 'Asia/Singapore', city: 'Singapore' },
      { id: 'Asia/Hong_Kong', city: 'Hong Kong' },
      { id: 'Asia/Shanghai', city: 'Shanghai' },
      { id: 'Asia/Taipei', city: 'Taipei' },
      { id: 'Asia/Seoul', city: 'Seoul' },
      { id: 'Asia/Tokyo', city: 'Tokyo' },
      { id: 'Asia/Manila', city: 'Manila' },
    ],
  },
  {
    region: 'Africa & Indian Ocean',
    zones: [
      { id: 'Africa/Casablanca', city: 'Casablanca' },
      { id: 'Africa/Lagos', city: 'Lagos' },
      { id: 'Africa/Cairo', city: 'Cairo' },
      { id: 'Africa/Nairobi', city: 'Nairobi' },
      { id: 'Africa/Johannesburg', city: 'Johannesburg' },
      { id: 'Indian/Reunion', city: 'Réunion' },
      { id: 'Indian/Mauritius', city: 'Mauritius' },
    ],
  },
  {
    region: 'Oceania',
    zones: [
      { id: 'Australia/Perth', city: 'Perth' },
      { id: 'Australia/Adelaide', city: 'Adelaide' },
      { id: 'Australia/Sydney', city: 'Sydney' },
      { id: 'Australia/Brisbane', city: 'Brisbane' },
      { id: 'Pacific/Auckland', city: 'Auckland' },
      { id: 'Pacific/Fiji', city: 'Fiji' },
    ],
  },
  {
    region: 'Reference',
    zones: [{ id: 'UTC', city: 'UTC' }],
  },
]
