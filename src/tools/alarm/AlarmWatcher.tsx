import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button.tsx'
import { Readout } from '../../components/Readout.tsx'
import { lastTrigger } from '../../engine/alarm.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { playSignal, unlockAudio } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { useDispatch, useStore } from '../../store/context.ts'
import { SNOOZE_MS, ringingAlarm } from './ringing.ts'

/**
 * Headless and mounted once: alarms ring from any route. What is ringing is
 * a question for `ringingAlarm`, asked fresh on every tick; this component
 * owns only what happens about it — the sound, the notification, and the
 * screen that takes over until it is dealt with.
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

  const ringing = ringingAlarm(alarms.alarms, now)

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
        <Readout text={ringing.time} live />
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
