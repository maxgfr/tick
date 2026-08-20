import { useMemo, useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { navigate, useHashParam } from '../../app/router.ts'
import {
  bestWindows,
  buildGrid,
  cityOf,
  convert,
  decodeMeeting,
  encodeMeeting,
  formatSummary,
  shiftDay,
  todayInZone,
  type MeetingParticipant,
} from '../../engine/meeting.ts'
import { zonedParts } from '../../engine/timezones.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useDispatch, useStore } from '../../store/context.ts'
import { MeetingGrid } from './MeetingGrid.tsx'
import { ParticipantList } from './ParticipantList.tsx'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const clockOf = (ms: number, zoneId: string): string => {
  const parts = zonedParts(zoneId, new Date(ms))
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

/**
 * The meeting tool: pick who is at the table, read the day in everyone's own
 * clock, and take away a line you can paste into a chat.
 *
 * The chosen instant lives in component state, not the store. It is a
 * transient question — reopening tomorrow with yesterday's answer pinned would
 * be worse than starting fresh — and the share link carries it when it matters.
 */
export function MeetingView() {
  const { meeting } = useStore()
  const dispatch = useDispatch()
  const now = useNow()
  const param = useHashParam()

  const [selectedAt, setSelectedAt] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const anchorZone = meeting.participants[0]?.zoneId ?? 'UTC'
  const day = meeting.day ?? todayInZone(anchorZone, now)

  const grid = useMemo(
    () => buildGrid(meeting.participants, day, meeting.durationMin),
    [meeting.participants, day, meeting.durationMin],
  )
  const windows = useMemo(() => bestWindows(grid, 3), [grid])

  // A link someone sent. Never imported silently: it would clobber the local
  // roster on a plain reload, and it is not this device's data.
  const shared = useMemo(() => (param === '' ? null : decodeMeeting(param)), [param])

  const rows =
    selectedAt === null ? [] : convert(meeting.participants, selectedAt, meeting.durationMin)

  const copy = (text: string, what: string): void => {
    void navigator.clipboard?.writeText(text)
    setCopied(what)
  }

  const shareLink = (): string => {
    const payload = encodeMeeting({
      v: 1,
      participants: meeting.participants as MeetingParticipant[],
      durationMin: meeting.durationMin,
      ...(selectedAt === null ? {} : { atMs: selectedAt }),
    })
    // Built from the live location so no origin is ever baked into the bundle.
    return `${window.location.href.split('#')[0] ?? ''}#/meeting/${payload}`
  }

  const dayParts =
    grid.slots[0] === undefined ? null : zonedParts(anchorZone, new Date(grid.slots[0].startMs))

  return (
    <div className="flex flex-col gap-8">
      {shared !== null && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xs border p-3"
          style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}
        >
          <p className="flex-1 text-sm">
            {`A shared meeting — ${String(shared.participants.length)} people, ${String(shared.durationMin)} minutes.`}
          </p>
          <Button
            variant="primary"
            onClick={() => {
              dispatch({
                type: 'meeting/replace',
                participants: shared.participants,
                durationMin: shared.durationMin,
              })
              if (shared.atMs !== undefined) setSelectedAt(shared.atMs)
              navigate('meeting')
            }}
          >
            Load it
          </Button>
          <Button onClick={() => navigate('meeting')}>Keep mine</Button>
        </div>
      )}

      <ParticipantList participants={meeting.participants} />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <Button
            ariaLabel="Previous day"
            title="Previous day"
            onClick={() => dispatch({ type: 'meeting/day', day: shiftDay(day, -1) })}
          >
            ←
          </Button>
          <p className="tnum min-w-40 text-center text-sm" style={{ color: 'var(--ink)' }}>
            {dayParts === null ? day : `${WEEKDAYS[dayParts.weekday] ?? ''} ${day}`}
          </p>
          <Button
            ariaLabel="Next day"
            title="Next day"
            onClick={() => dispatch({ type: 'meeting/day', day: shiftDay(day, 1) })}
          >
            →
          </Button>
          <Button onClick={() => dispatch({ type: 'meeting/day' })}>Today</Button>
        </div>

        <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          Meeting length
          <select
            value={meeting.durationMin}
            aria-label="Meeting length"
            onChange={(event) =>
              dispatch({ type: 'meeting/duration', durationMin: Number(event.target.value) })
            }
            className="rounded-xs border px-3 py-2"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          >
            {[15, 30, 45, 60, 90, 120].map((minutes) => (
              <option key={minutes} value={minutes}>
                {`${String(minutes)} min`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="flex flex-col gap-2" aria-label="Best times">
        <h2
          className="font-display text-sm font-semibold tracking-wide uppercase"
          style={{ color: 'var(--ink-3)' }}
        >
          Best times
        </h2>
        {windows.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            No window works for everyone on this day — try another day, a shorter meeting, or widen
            someone’s hours.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {windows.map((window) => (
              <li key={window.startMs}>
                <Button onClick={() => setSelectedAt(window.startMs)}>
                  {`${clockOf(window.startMs, anchorZone)}–${clockOf(window.endMs, anchorZone)}`}
                  {window.verdict === 'stretch' ? ' · a stretch' : ''}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MeetingGrid
        grid={grid}
        participants={meeting.participants}
        selectedAt={selectedAt}
        onSelect={setSelectedAt}
      />

      {selectedAt !== null && (
        <section className="flex flex-col gap-3" aria-label="Chosen time">
          <h2
            className="font-display text-sm font-semibold tracking-wide uppercase"
            style={{ color: 'var(--ink-3)' }}
          >
            Chosen time
          </h2>
          <ul className="flex flex-col gap-1">
            {rows.map((row) => (
              <li key={row.id} className="flex items-baseline gap-3 text-sm">
                <span className="min-w-32" style={{ color: 'var(--ink-2)' }}>
                  {row.label.trim() === '' ? cityOf(row.zoneId) : row.label}
                </span>
                <span className="tnum" style={{ color: 'var(--ink)' }}>
                  {row.time}
                </span>
                {row.dayOffset !== 0 && (
                  <span className="text-xs" style={{ color: 'var(--accent)' }}>
                    {row.dayOffset > 0
                      ? `+${String(row.dayOffset)} day`
                      : `${String(row.dayOffset)} day`}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                copy(
                  formatSummary(meeting.participants, selectedAt, meeting.durationMin),
                  'summary',
                )
              }
            >
              Copy summary
            </Button>
            <Button onClick={() => copy(shareLink(), 'link')}>Copy link</Button>
            <Button onClick={() => setSelectedAt(null)}>Clear</Button>
          </div>
          <output aria-live="polite" className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {copied === 'summary'
              ? 'Summary copied.'
              : copied === 'link'
                ? 'Link copied — it carries the whole table, and never leaves your device on its own.'
                : ''}
          </output>
        </section>
      )}
    </div>
  )
}
