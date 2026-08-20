import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button.tsx'
import { FlipReadout } from '../../components/FlipReadout.tsx'
import { TileRow } from '../../components/TileRow.tsx'
import { formatClock, formatHuman } from '../../engine/duration.ts'
import { isDone, progress, remainingMs } from '../../engine/countdown.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { playSignal } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { useDispatch, useStore } from '../../store/context.ts'

/**
 * One countdown. Everything on screen — readout, tile row, buttons — is
 * derived from `now` on each tick; the card holds no time of its own. The
 * completion side effects fire on the derived done-transition, so a throttled
 * background tab beeps exactly once when it catches up, never once per
 * skipped tick.
 */
export function TimerCard({ id }: { id: string }) {
  const now = useNow()
  const dispatch = useDispatch()
  const { settings, countdown } = useStore()

  const timer = countdown.timers.find((candidate) => candidate.id === id)
  const done = timer !== undefined && isDone(timer, now)

  // Hooks stay unconditional; the guard lives inside the effect.
  //
  // The ref is keyed by the *run*, not the timer: `endAt` is re-stamped on
  // restart while `id` never changes, so keying by id silenced every run
  // after the first — no beep, no notification, and `countdown/fired` never
  // dispatched, so `firedAt` stayed undefined forever.
  const firedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!timer || !done || timer.firedAt !== undefined) return
    const run = `${timer.id}:${String(timer.endAt)}`
    if (firedFor.current === run) return
    firedFor.current = run
    dispatch({ type: 'countdown/fired', id: timer.id, now: Date.now() })
    if (settings.sound) playSignal('countdown-done')
    if (settings.notifications) {
      fireNotification(`tick · ${timer.label}`, `${formatHuman(timer.totalMs)} — time's up`)
    }
  }, [done, timer, settings.sound, settings.notifications, dispatch])

  if (!timer) return null

  const running = !done && timer.pausedRemainingMs === undefined && timer.endAt !== undefined

  const remaining = remainingMs(timer, now)

  return (
    <li
      className="flex flex-col gap-3 rounded-xs border p-4"
      style={{
        borderColor: done ? 'var(--accent)' : 'var(--line)',
        background: 'var(--surface)',
      }}
      aria-label={`Timer ${timer.label}`}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p
            className="font-display truncate text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--ink-2)' }}
          >
            {timer.label}
          </p>
          <p className="py-1 text-4xl" style={{ color: done ? 'var(--accent)' : 'var(--ink)' }}>
            <FlipReadout text={formatClock(remaining)} />
          </p>
          {done && (
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Done — {formatHuman(timer.totalMs)} elapsed
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {running ? (
            <Button
              onClick={() => dispatch({ type: 'countdown/pause', id: timer.id, now: Date.now() })}
            >
              Pause
            </Button>
          ) : (
            !done && (
              <Button
                onClick={() =>
                  dispatch({ type: 'countdown/resume', id: timer.id, now: Date.now() })
                }
              >
                Resume
              </Button>
            )
          )}
          <Button
            onClick={() => dispatch({ type: 'countdown/restart', id: timer.id, now: Date.now() })}
          >
            Restart
          </Button>
          <Button
            variant="danger"
            title="Remove timer"
            onClick={() => dispatch({ type: 'countdown/remove', id: timer.id })}
          >
            Remove
          </Button>
        </div>
      </div>
      <TileRow cells={24} filled={progress(timer, now) * 24} className="w-full" />
    </li>
  )
}
