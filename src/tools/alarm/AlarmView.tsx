import { useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { lastTrigger, nextTrigger } from '../../engine/alarm.ts'
import { formatClock } from '../../engine/duration.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { playSignal } from '../../lib/audio.ts'
import { requestNotificationPermission } from '../../lib/notify.ts'
import { useDispatch, useStore } from '../../store/context.ts'
import type { AlarmItem } from '../../store/types.ts'

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CATCH_UP_MS = 15 * 60_000
const MISSED_WINDOW_MS = 24 * 60 * 60_000

/**
 * Alarms: a wall-clock time, the days it may ring, and nothing else. The
 * list shows when each alarm fires next; a missed occurrence is called out
 * instead of silently skipped.
 */
export function AlarmView() {
  const { alarms } = useStore()
  const dispatch = useDispatch()
  const now = useNow()

  const [timeText, setTimeText] = useState('07:00')
  const [permissionNote, setPermissionNote] = useState('')

  const add = (): void => {
    if (!TIME.test(timeText)) return
    dispatch({ type: 'alarm/add', time: timeText })
  }

  const enableNotifications = (): void => {
    void requestNotificationPermission().then((permission) => {
      setPermissionNote(
        permission === 'granted'
          ? 'Notifications are on.'
          : 'No notification permission — the alarm will still ring and beep.',
      )
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        aria-label="Add an alarm"
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          Time
          <input
            type="text"
            value={timeText}
            inputMode="numeric"
            autoComplete="off"
            placeholder="07:30"
            onChange={(event) => setTimeText(event.target.value)}
            className="tnum w-24 rounded-md border px-3 py-2 text-lg"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          />
        </label>
        <Button type="submit" variant="primary">
          Add alarm
        </Button>
      </form>

      <ul className="flex flex-col gap-3" aria-label="Alarms">
        {alarms.alarms.map((alarm) => (
          <AlarmRow key={alarm.id} alarm={alarm} now={now} />
        ))}
      </ul>

      {alarms.alarms.length === 0 && (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          No alarms yet — add one above.
        </p>
      )}

      <div
        className="flex flex-wrap items-center gap-3 border-t pt-4"
        style={{ borderColor: 'var(--line)' }}
      >
        <Button onClick={enableNotifications}>Enable notifications</Button>
        <Button onClick={() => playSignal('alarm')}>Test sound</Button>
        {permissionNote && (
          <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {permissionNote}
          </span>
        )}
      </div>
    </div>
  )
}

function AlarmRow({ alarm, now }: { alarm: AlarmItem; now: number }) {
  const dispatch = useDispatch()
  const last = lastTrigger(alarm, new Date(now))
  const next = nextTrigger(alarm, new Date(now))
  const missed =
    last !== null &&
    last > (alarm.lastRangAt ?? 0) &&
    now - last > CATCH_UP_MS &&
    now - last <= MISSED_WINDOW_MS

  const toggleDay = (day: number): void => {
    const days = alarm.days.includes(day)
      ? alarm.days.filter((candidate) => candidate !== day)
      : [...alarm.days, day].sort((a, b) => a - b)
    dispatch({ type: 'alarm/setDays', id: alarm.id, days })
  }

  return (
    <li
      className="flex flex-wrap items-center gap-4 rounded-xl border p-4"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      aria-label={`Alarm ${alarm.time}`}
    >
      <p
        className="tnum text-3xl font-semibold"
        style={{ color: alarm.enabled ? 'var(--ink)' : 'var(--ink-3)' }}
      >
        {alarm.time}
      </p>

      <fieldset className="flex gap-1">
        <legend className="sr-only">Days for {alarm.time}</legend>
        {DAY_LABELS.map((label, day) => (
          <button
            key={label}
            type="button"
            aria-pressed={alarm.days.includes(day)}
            onClick={() => toggleDay(day)}
            className="rounded-md border px-2 py-1 text-xs font-medium"
            style={{
              borderColor: alarm.days.includes(day) ? 'var(--accent)' : 'var(--line)',
              color: alarm.days.includes(day) ? 'var(--accent)' : 'var(--ink-3)',
            }}
          >
            {label}
          </button>
        ))}
      </fieldset>

      <div className="ml-auto flex items-center gap-3">
        {missed && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            Missed
          </span>
        )}
        {next !== null && (
          <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
            rings in {formatClock(next - now)}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={alarm.enabled}
          aria-label={alarm.time}
          onClick={() => dispatch({ type: 'alarm/toggle', id: alarm.id })}
          className="h-6 w-11 rounded-full border transition-colors"
          style={{
            borderColor: alarm.enabled ? 'var(--accent)' : 'var(--line)',
            background: alarm.enabled ? 'var(--accent)' : 'transparent',
            position: 'relative',
          }}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
            style={{
              left: alarm.enabled ? 'calc(100% - 1.125rem)' : '0.125rem',
              background: alarm.enabled ? 'var(--accent-ink)' : 'var(--ink-3)',
            }}
          />
        </button>
        <Button
          variant="danger"
          ariaLabel={`Remove ${alarm.time}`}
          onClick={() => dispatch({ type: 'alarm/remove', id: alarm.id })}
        >
          ×
        </Button>
      </div>
    </li>
  )
}
