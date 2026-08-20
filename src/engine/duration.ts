/**
 * Duration parsing and formatting — the vocabulary every tool speaks.
 *
 * Pure: no React, no DOM, no clock. Every countdown readout, preset label and
 * calculator result in the app goes through here, so "6:30" means the same
 * thing everywhere.
 */

const SECOND = 1_000
const MINUTE = 60_000
const HOUR = 3_600_000

const COLON = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/
const UNITS = /(\d+)\s*(h|m|s)(?=$|\s|\d)/gi

/**
 * Accepts the three ways people write a duration:
 *  - bare seconds:        "90"
 *  - clock:               "1:30" (m:ss) or "1:30:00" (h:mm:ss)
 *  - unit suffixes:       "25m", "1h30m", "1h 30m 15s"
 * Returns milliseconds, or null when the input is not a duration.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim()
  if (text === '') return null

  const colon = text.match(COLON)
  if (colon) {
    const [, a, b, c] = colon
    if (a === undefined || b === undefined) return null
    if (c === undefined) return (Number(a) * 60 + Number(b)) * SECOND
    return (Number(a) * 3600 + Number(b) * 60 + Number(c)) * SECOND
  }

  if (/^\d+$/.test(text)) return Number(text) * SECOND

  let ms = 0
  let matched = ''
  let cursor = 0
  for (const match of text.matchAll(UNITS)) {
    const index = match.index ?? 0
    // Only spaces may sit between units — "1h30m" and "1h 30m" parse, "1hx" does not.
    if (text.slice(cursor, index).trim() !== '') return null
    const unit = match[2]?.toLowerCase()
    const value = Number(match[1])
    ms += value * (unit === 'h' ? HOUR : unit === 'm' ? MINUTE : SECOND)
    matched += match[0]
    cursor = index + match[0].length
  }
  if (matched === '' || text.slice(cursor).trim() !== '') return null
  return ms
}

/**
 * Countdown readout: "6:30" under an hour, "2:05:00" from an hour up, tenths
 * optional for the stopwatch. Rounds to the nearest displayed unit.
 *
 * A negative duration is formatted as its magnitude behind a minus sign. The
 * calculator is documented to go negative, and `Math.floor` with `%` both run
 * the wrong way there: `1:30 - 3m` used to read "-2:-30".
 */
export function formatClock(ms: number, opts?: { tenths?: boolean; forceHours?: boolean }): string {
  const sign = ms < 0 ? '-' : ''
  const magnitude = Math.abs(ms)
  const rounded = opts?.tenths ? magnitude : Math.ceil(magnitude / SECOND) * SECOND
  const totalSeconds = Math.floor(rounded / SECOND)
  const tenths = Math.floor((rounded % SECOND) / 100)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  const tenth = opts?.tenths ? `.${String(tenths)}` : ''

  if (hours > 0 || opts?.forceHours) return `${sign}${hours}:${mm}:${ss}${tenth}`
  return `${sign}${minutes}:${ss}${tenth}`
}

/**
 * Human phrasing for labels and results: the two most significant units,
 * "1h 30m" rather than "1:30:00" — for reading, not timing against.
 *
 * Negative durations read as a signed magnitude. Clamping them to "0s" while
 * the clock readout above showed something else gave one expression two
 * different answers on two adjacent lines.
 */
export function formatHuman(ms: number): string {
  if (ms === 0) return '0s'
  const sign = ms < 0 ? '-' : ''
  const magnitude = Math.abs(ms)

  const hours = Math.floor(magnitude / HOUR)
  const minutes = Math.floor((magnitude % HOUR) / MINUTE)
  const seconds = Math.floor((magnitude % MINUTE) / SECOND)

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`)

  return parts.length > 0 ? `${sign}${parts.slice(0, 2).join(' ')}` : '0s'
}
