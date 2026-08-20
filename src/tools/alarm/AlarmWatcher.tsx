import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button.tsx'
import { FlipReadout } from '../../components/FlipReadout.tsx'
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
 * derived, never stored.
 *
 * The snooze is a persisted timestamp on the alarm, like every other run in
 * this app. Holding it in component state meant a reload cancelled it and the
 * alarm went off again immediately.
 */
export function AlarmWatcher() {
  const { alarms, settings } = useStore()
  const dispatch = useDispatch()
  const now = useNow()

  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const ringing = alarms.alarms.find((alarm) => {
    if (!alarm.enabled) return false
    const last = lastTrigger(alarm, new Date(now))
    if (last === null || last <= (alarm.lastRangAt ?? 0)) return false

    const snoozedUntil = alarm.snoozedUntil ?? 0
    if (now < snoozedUntil) return false

    // The catch-up window runs from whatever is due — the occurrence, or the
    // end of a snooze. Measuring it from the original occurrence meant the
    // third snooze walked the alarm past its own fifteen-minute window, and
    // it never rang again, with nothing on screen to say so.
    if (now - Math.max(last, snoozedUntil) > CATCH_UP_MS) return false
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
      <p
        className="font-display text-2xl font-semibold uppercase tracking-wide"
        style={{ color: 'var(--ink-3)' }}
      >
        tick · alarm
      </p>
      <p className="text-8xl" style={{ color: 'var(--accent)' }}>
        <FlipReadout text={ringing.time} />
      </p>
      <div className="flex gap-3">
        <Button
          size="lg"
          onClick={() =>
            dispatch({ type: 'alarm/snooze', id: ringing.id, until: Date.now() + SNOOZE_MS })
          }
        >
          Snooze 5 min
        </Button>
        <Button size="lg" variant="primary" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
