/**
 * Meeting math: when can these people actually talk to each other.
 *
 * The one rule everything else follows — working hours are *local wall-clock*
 * hours, so availability is derived from the absolute instant through
 * `zonedParts`, never by adding a stored offset. That is what makes daylight
 * saving correct for free: on 2026-03-15, Paris 14:00 is New York 09:00, but
 * two weeks earlier it was 08:00, because the US changed and Europe had not.
 * Any implementation that caches one offset gets that fortnight wrong.
 */
import { isKnownZone, zonedParts, zonedTimeToInstant } from './timezones.ts'

/** Half-hour steps: India (+5:30) and Adelaide (+9:30) are in the picker. */
export const SLOT_MIN = 30
/** How far outside working hours still counts as askable. */
export const FRINGE_MIN = 60
export const MAX_PARTICIPANTS = 8
export const DEFAULT_START_MIN = 9 * 60
export const DEFAULT_END_MIN = 17 * 60

const MIN_MS = 60_000
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

export type Availability = 'working' | 'fringe' | 'off'
export type SlotVerdict = 'all' | 'stretch' | 'none'

export interface MeetingParticipant {
  id: string
  /** Free text; the view falls back to the city when it is empty. */
  label: string
  zoneId: string
  /** Minutes from local midnight, inclusive. */
  startMin: number
  /** Minutes from local midnight, exclusive. */
  endMin: number
}

export interface ParticipantSlot {
  id: string
  availability: Availability
  /** Local wall clock at the slot start, "HH:MM". */
  time: string
  /** Civil days from the anchor's day: 0, 1, -1. */
  dayOffset: number
}

export interface Slot {
  startMs: number
  /** Wall clock at the anchor, "HH:MM". */
  anchorTime: string
  verdict: SlotVerdict
  /** Two per working participant, one per fringe. Ordering only. */
  score: number
  participants: ParticipantSlot[]
}

export interface Grid {
  /** The civil day shown, "YYYY-MM-DD" in the anchor's zone. */
  day: string
  anchorZoneId: string
  /** 46, 48 or 50 — a civil day is not always 24 hours long. */
  slots: Slot[]
}

const pad = (value: number): string => String(value).padStart(2, '0')

const dayOf = (parts: { year: number; month: number; day: number }): string =>
  `${String(parts.year)}-${pad(parts.month)}-${pad(parts.day)}`

const parseDay = (day: string): { year: number; month: number; day: number } | null => {
  const match = DAY.exec(day)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const date = Number(match[3])
  if (month < 1 || month > 12 || date < 1 || date > 31) return null
  return { year, month, day: date }
}

/** "YYYY-MM-DD" for the civil today in a zone. */
export function todayInZone(zoneId: string, nowMs: number): string {
  return dayOf(zonedParts(zoneId, new Date(nowMs)))
}

/** Civil-date arithmetic for the previous/next day controls. No zone involved. */
export function shiftDay(day: string, delta: number): string {
  const parsed = parseDay(day)
  if (parsed === null) return day
  const moved = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + delta))
  return dayOf({
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  })
}

/** Whole civil days between two "YYYY-MM-DD" strings. Exact, DST-immune. */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from)
  const b = parseDay(to)
  if (a === null || b === null) return 0
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)
  return Math.round(ms / 86_400_000)
}

const withinWindow = (startLocal: number, endLocal: number, from: number, to: number): boolean =>
  startLocal >= from && endLocal <= to

/**
 * Where a whole meeting span falls in one participant's local day.
 *
 * The *span*, not the start: a 09:00 start is no good to someone who stops at
 * 10:00 if the meeting runs two hours. A span that crosses the participant's
 * local midnight is always off — nobody's working day wraps.
 */
export function availabilityAt(
  participant: MeetingParticipant,
  startMs: number,
  durationMin: number,
): Availability {
  const start = zonedParts(participant.zoneId, new Date(startMs))
  const end = zonedParts(participant.zoneId, new Date(startMs + durationMin * MIN_MS))

  const startLocal = start.hour * 60 + start.minute
  const endLocal = end.hour * 60 + end.minute

  // Same civil day, or the meeting spills past local midnight.
  if (dayOf(start) !== dayOf(end) && endLocal !== 0) return 'off'
  const endMinutes = dayOf(start) === dayOf(end) ? endLocal : 24 * 60

  if (withinWindow(startLocal, endMinutes, participant.startMin, participant.endMin))
    return 'working'
  if (
    withinWindow(
      startLocal,
      endMinutes,
      participant.startMin - FRINGE_MIN,
      participant.endMin + FRINGE_MIN,
    )
  ) {
    return 'fringe'
  }
  return 'off'
}

const verdictOf = (availabilities: readonly Availability[]): SlotVerdict => {
  if (availabilities.length === 0) return 'none'
  if (availabilities.some((a) => a === 'off')) return 'none'
  return availabilities.every((a) => a === 'working') ? 'all' : 'stretch'
}

const scoreOf = (availabilities: readonly Availability[]): number =>
  availabilities.reduce((sum, a) => sum + (a === 'working' ? 2 : a === 'fringe' ? 1 : 0), 0)

/**
 * The whole planning answer for one civil day in the first participant's zone.
 *
 * Slots are generated by stepping the absolute clock and stopping when the
 * anchor's civil date rolls over — so a spring-forward day is 46 slots and a
 * fall-back day is 50. A fixed 48 would print an hour that does not exist.
 */
export function buildGrid(
  participants: readonly MeetingParticipant[],
  day: string,
  durationMin: number,
): Grid {
  const anchor = participants[0]
  if (anchor === undefined || parseDay(day) === null) {
    return { day, anchorZoneId: anchor?.zoneId ?? 'UTC', slots: [] }
  }

  const parsed = parseDay(day)!
  const dayStart = zonedTimeToInstant(anchor.zoneId, parsed)
  const slots: Slot[] = []

  // A guard, not a limit: 50 is the longest a civil day can be in half-hours.
  for (let step = 0; step < 60; step += 1) {
    const startMs = dayStart + step * SLOT_MIN * MIN_MS
    const anchorParts = zonedParts(anchor.zoneId, new Date(startMs))
    if (dayOf(anchorParts) !== day) break

    const cells = participants.map((participant) => {
      const local = zonedParts(participant.zoneId, new Date(startMs))
      return {
        id: participant.id,
        availability: availabilityAt(participant, startMs, durationMin),
        time: `${pad(local.hour)}:${pad(local.minute)}`,
        dayOffset: daysBetween(day, dayOf(local)),
      }
    })

    const availabilities = cells.map((cell) => cell.availability)
    slots.push({
      startMs,
      anchorTime: `${pad(anchorParts.hour)}:${pad(anchorParts.minute)}`,
      verdict: verdictOf(availabilities),
      score: scoreOf(availabilities),
      participants: cells,
    })
  }

  return { day, anchorZoneId: anchor.zoneId, slots }
}

export interface Window {
  startMs: number
  endMs: number
  verdict: 'all' | 'stretch'
}

/**
 * Contiguous runs of workable slots, best first.
 *
 * Merged rather than listed: a human wants "you are all free 14:00-16:00",
 * not four half-hour rows saying the same thing.
 *
 * Two passes on purpose. A single pass that merges everything workable and
 * keeps the weaker verdict swallows the perfect window inside a longer
 * stretched one, and the best answer disappears into the compromise. So runs
 * where everyone is working are found first, and the wider runs where someone
 * is stretching are reported separately — a real answer and a fallback, not
 * one blurred into the other.
 */
export function bestWindows(grid: Grid, limit: number): Window[] {
  const runs = (
    accept: (verdict: SlotVerdict) => boolean,
    verdict: 'all' | 'stretch',
  ): Window[] => {
    const found: Window[] = []
    let current: Window | null = null
    for (const slot of grid.slots) {
      if (!accept(slot.verdict)) {
        if (current !== null) found.push(current)
        current = null
        continue
      }
      const end = slot.startMs + SLOT_MIN * MIN_MS
      if (current === null) current = { startMs: slot.startMs, endMs: end, verdict }
      else current.endMs = end
    }
    if (current !== null) found.push(current)
    return found
  }

  const perfect = runs((v) => v === 'all', 'all')
  const workable = runs((v) => v !== 'none', 'stretch').filter(
    // A stretched run that is exactly a perfect one adds nothing.
    (run) => !perfect.some((best) => best.startMs === run.startMs && best.endMs === run.endMs),
  )

  const longestFirst = (a: Window, b: Window): number => {
    const spanA = a.endMs - a.startMs
    const spanB = b.endMs - b.startMs
    return spanA === spanB ? a.startMs - b.startMs : spanB - spanA
  }

  return [...perfect.sort(longestFirst), ...workable.sort(longestFirst)].slice(0, limit)
}

export interface Conversion {
  id: string
  label: string
  zoneId: string
  /** "HH:MM" local. */
  time: string
  /** "YYYY-MM-DD" local. */
  date: string
  /** 0 (Sunday) to 6 (Saturday). */
  weekday: number
  /** Civil days from the first participant's day. */
  dayOffset: number
  availability: Availability
}

/** One instant, in every participant's local terms. */
export function convert(
  participants: readonly MeetingParticipant[],
  instantMs: number,
  durationMin: number,
): Conversion[] {
  const anchor = participants[0]
  if (anchor === undefined) return []
  const anchorDay = dayOf(zonedParts(anchor.zoneId, new Date(instantMs)))

  return participants.map((participant) => {
    const local = zonedParts(participant.zoneId, new Date(instantMs))
    return {
      id: participant.id,
      label: participant.label,
      zoneId: participant.zoneId,
      time: `${pad(local.hour)}:${pad(local.minute)}`,
      date: dayOf(local),
      weekday: local.weekday,
      dayOffset: daysBetween(anchorDay, dayOf(local)),
      availability: availabilityAt(participant, instantMs, durationMin),
    }
  })
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * The block people paste into a chat. Pure — no clock inside, so the same
 * arguments always produce the same text.
 */
export function formatSummary(
  participants: readonly MeetingParticipant[],
  instantMs: number,
  durationMin: number,
  opts?: { title?: string },
): string {
  const rows = convert(participants, instantMs, durationMin)
  if (rows.length === 0) return ''

  const head = rows[0]!
  const parsed = parseDay(head.date)!
  const title = opts?.title?.trim()
  const lines = [
    `${title === undefined || title === '' ? 'Meeting' : title} · ${String(durationMin)} min`,
    `${WEEKDAYS[head.weekday] ?? ''} ${String(parsed.day)} ${MONTHS[parsed.month - 1] ?? ''} ${String(parsed.year)}`,
    '',
  ]

  const names = rows.map((row) => (row.label.trim() === '' ? cityOf(row.zoneId) : row.label.trim()))
  const width = Math.max(...names.map((name) => name.length))

  rows.forEach((row, index) => {
    const marker =
      row.dayOffset === 0
        ? ''
        : row.dayOffset > 0
          ? ` +${String(row.dayOffset)}d`
          : ` ${String(row.dayOffset)}d`
    lines.push(`${(names[index] ?? '').padEnd(width)}  ${row.time}${marker}`)
  })

  return lines.join('\n')
}

/** "Europe/Paris" → "Paris". The picker's own label, without importing it. */
export function cityOf(zoneId: string): string {
  return zoneId.split('/').pop()?.replaceAll('_', ' ') ?? zoneId
}

export interface MeetingPayload {
  v: 1
  participants: MeetingParticipant[]
  durationMin: number
  /** A pinned instant, when the link shares a decision and not just a roster. */
  atMs?: number
}

/**
 * A share link's payload, URL-safe and dependency-free.
 *
 * `encodeURIComponent` first, so the string is pure ASCII before `btoa` — a
 * label like "São Paulo" would otherwise throw. Nothing here touches the
 * network: the payload rides in the fragment, which browsers never send.
 */
export function encodeMeeting(payload: MeetingPayload): string {
  const compact = {
    v: 1,
    d: payload.durationMin,
    ...(payload.atMs === undefined ? {} : { a: payload.atMs }),
    p: payload.participants.map((participant) => [
      participant.zoneId,
      participant.label,
      participant.startMin,
      participant.endMin,
    ]),
  }
  return btoa(encodeURIComponent(JSON.stringify(compact)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

/** The inverse, validating rather than trusting. Returns null on anything off. */
export function decodeMeeting(encoded: string): MeetingPayload | null {
  if (encoded === '' || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null

  let parsed: unknown
  try {
    const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/')
    parsed = JSON.parse(decodeURIComponent(atob(base64)))
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const data = parsed as Record<string, unknown>
  if (data.v !== 1) return null
  if (!inRange(data.d, 5, 480)) return null
  if (data.a !== undefined && !inRange(data.a, 0, 8.64e15)) return null
  if (!Array.isArray(data.p) || data.p.length === 0 || data.p.length > MAX_PARTICIPANTS) return null

  const participants: MeetingParticipant[] = []
  for (const [index, row] of data.p.entries()) {
    if (!Array.isArray(row) || row.length !== 4) return null
    const [zoneId, label, startMin, endMin] = row as unknown[]
    if (typeof zoneId !== 'string' || !isKnownZone(zoneId)) return null
    if (typeof label !== 'string' || label.length > 60) return null
    if (!inRange(startMin, 0, 1440) || !inRange(endMin, 0, 1440)) return null
    if (startMin >= endMin) return null
    participants.push({ id: `shared-${String(index)}`, label, zoneId, startMin, endMin })
  }

  return {
    v: 1,
    participants,
    durationMin: data.d,
    ...(data.a === undefined ? {} : { atMs: data.a as number }),
  }
}
