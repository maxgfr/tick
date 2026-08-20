import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button.tsx'
import { isDone } from '../../engine/countdown.ts'
import { formatHuman } from '../../engine/duration.ts'
import { DESKTOP_NAV, useMediaQuery } from '../../hooks/useMediaQuery.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { playSignal, unlockAudio } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { useDispatch, useStore } from '../../store/context.ts'
import { RING_INTERVAL_MS, isRinging } from './ringing.ts'

/**
 * Mounted once, next to the alarm watcher: a countdown rings from any route.
 *
 * A kitchen timer is set and then walked away from — to the stopwatch, to the
 * metronome, to another tab entirely. While the board owned the sound, that
 * walk made it silent: the cards were unmounted, so nothing beeped and
 * nothing notified. The end of a countdown is now the shell's business.
 *
 * Everything here is derived from `now` on each tick, so a timer that ran out
 * during a throttled tab rings the moment the tab comes back, and one that
 * ran out an hour ago stays quiet.
 *
 * The bar is the Stop you can always reach. The board's cards keep their own
 * Stop — finer, one timer at a time — but a card can be scrolled past, and
 * every other tool has no card at all.
 */
export function CountdownWatcher() {
  const { countdown, settings } = useStore()
  const dispatch = useDispatch()
  const now = useNow()
  const desktop = useMediaQuery(DESKTOP_NAV)
  const timers = countdown.timers

  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  /**
   * Mark and announce each timer as it crosses zero, once.
   *
   * `firedAt` is the durable guard; the ref is the same-tick one, because a
   * dispatch does not land before the next render and a 250ms tick is plenty
   * of time to notify twice. Keyed by the *run* — `endAt` is re-stamped on
   * restart, `id` never changes — so a second run announces itself too.
   */
  const announced = useRef(new Set<string>())
  useEffect(() => {
    for (const timer of timers) {
      if (!isDone(timer, now) || timer.firedAt !== undefined) continue
      const run = `${timer.id}:${String(timer.endAt)}`
      if (announced.current.has(run)) continue
      announced.current.add(run)
      dispatch({ type: 'countdown/fired', id: timer.id, now: Date.now() })
      if (settings.notifications) {
        fireNotification(`tick · ${timer.label}`, `${formatHuman(timer.totalMs)} — time's up`)
      }
    }
  }, [timers, now, settings.notifications, dispatch])

  const ringing = timers.filter((timer) => isRinging(timer, now))
  const anyRinging = ringing.length > 0

  // The screen stays up while it rings: the button that stops it should be
  // there when you walk back, not behind a wake-and-unlock.
  useWakeLock(anyRinging)

  // One loop for the whole app, however many timers are up — and it keeps
  // going, because a countdown heard once is a countdown missed.
  useEffect(() => {
    if (!anyRinging || !settings.sound) return
    playSignal('countdown-done')
    const id = window.setInterval(() => playSignal('countdown-done'), RING_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [anyRinging, settings.sound])

  if (!anyRinging) return null

  const first = ringing[0]
  const headline =
    ringing.length === 1 && first !== undefined
      ? `${first.label} — time's up`
      : `${ringing.length} timers — time's up`

  const stopAll = (): void => {
    // One timestamp for the lot: they were all stopped by the same tap.
    const at = Date.now()
    for (const timer of ringing) dispatch({ type: 'countdown/silence', id: timer.id, now: at })
  }

  return (
    <div
      role="alert"
      aria-label="Timer ringing"
      // Clears the rail on a wide screen rather than covering it: the bar is
      // an alert, not a takeover, and the navigation stays usable under it.
      className={`fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 ${desktop ? 'pl-56' : ''}`}
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--accent)',
        color: 'var(--ink)',
      }}
    >
      <p
        className="font-display min-w-0 truncate text-sm font-semibold tracking-wide uppercase"
        style={{ color: 'var(--accent)' }}
      >
        {headline}
      </p>
      <Button variant="primary" ariaLabel="Stop ringing" onClick={stopAll}>
        Stop
      </Button>
    </div>
  )
}
