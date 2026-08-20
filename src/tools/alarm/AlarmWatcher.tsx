import { useEffect, useRef, useState } from 'react'
import { lastTrigger } from '../../engine/alarm.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { playSignal, unlockAudio } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { useDispatch, useStore } from '../../store/context.ts'

const CATCH_UP_MS = 15 * 60_000
const SNOOZE_MS = 5 * 60_000

/**
 * Headless and mounted once: alarms ring from any route. Nothing is
 * scheduled — every render asks the engine what already passed, so an
 * occurrence missed during a reload or a throttled tab still rings (within a
 * quarter hour) and never rings twice. Whether an alarm is ringing is
 * derived, not stored; the only local state is an optional snooze.
 */
export function AlarmWatcher() {
  const { alarms, settings } = useStore()
  const dispatch = useDispatch()
  const now = useNow()

  const [snooze, setSnooze] = useState<{ id: string; wakeAt: number } | null>(null)

  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const ringing = alarms.alarms.find((alarm) => {
    if (!alarm.enabled) return false
    const last = lastTrigger(alarm, new Date(now))
    if (last === null || last <= (alarm.lastRangAt ?? 0)) return false
    if (now - last > CATCH_UP_MS) return false
    if (snooze !== null && snooze.id === alarm.id && now < snooze.wakeAt) return false
    return true
  })

  // One notification per ring — including the wake-up after a snooze.
  const ringKey = ringing === undefined ? null : `${ringing.id}:${ringing.time}`
  const notifiedFor = useRef<string | null>(null)
  useEffect(() => {
    if (ringKey === null || ringing === undefined) {
      notifiedFor.current = null
      return
    }
    if (notifiedFor.current === ringKey) return
    notifiedFor.current = ringKey
    if (settings.notifications) {
      fireNotification('tick · alarm', `It’s ${ringing.time} — time’s up.`)
    }
  }, [ringing, ringKey, settings.notifications])

  // While the overlay is up, the alarm keeps saying so.
  const isRinging = ringing !== undefined
  useEffect(() => {
    if (!isRinging) return
    playSignal('alarm')
    const id = window.setInterval(() => playSignal('alarm'), 1_500)
    return () => window.clearInterval(id)
  }, [isRinging])

  if (!isRinging || ringing === undefined) return null

  const dismiss = (): void => {
    const last = lastTrigger(ringing, new Date())
    if (last !== null) dispatch({ type: 'alarm/fired', id: ringing.id, at: last })
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Alarm ${ringing.time}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ background: 'var(--surface)', color: 'var(--ink)' }}
    >
      <p className="text-2xl" style={{ color: 'var(--ink-3)' }}>
        ⏰ tick · alarm
      </p>
      <p className="tnum text-8xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
        {ringing.time}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setSnooze({ id: ringing.id, wakeAt: Date.now() + SNOOZE_MS })}
          className="rounded-md border px-5 py-2.5 text-base font-medium"
          style={{ borderColor: 'var(--line)' }}
        >
          Snooze 5 min
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md px-5 py-2.5 text-base font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
