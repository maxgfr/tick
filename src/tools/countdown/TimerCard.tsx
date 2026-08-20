import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button.tsx'
import { Dial } from '../../components/Dial.tsx'
import { formatClock, formatHuman } from '../../engine/duration.ts'
import { isDone, progress, remainingMs } from '../../engine/countdown.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { playSignal } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { useDispatch, useStore } from '../../store/context.ts'

/**
 * One countdown. Everything on screen — readout, ring, buttons — is derived
 * from `now` on each tick; the card holds no time of its own. The completion
 * side effects fire on the derived done-transition, so a throttled background
 * tab beeps exactly once when it catches up, never once per skipped tick.
 */
export function TimerCard({ id }: { id: string }) {
  const now = useNow()
  const dispatch = useDispatch()
  const { settings, countdown } = useStore()

  const timer = countdown.timers.find((candidate) => candidate.id === id)
  const done = timer !== undefined && isDone(timer, now)

  // Hooks stay unconditional; the guard lives inside the effect.
  const firedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!timer || !done || timer.firedAt !== undefined || firedFor.current === timer.id) return
    firedFor.current = timer.id
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
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{
        borderColor: done ? 'var(--accent)' : 'var(--line)',
        background: 'var(--surface)',
      }}
      aria-label={`Timer ${timer.label}`}
    >
      <div className="flex items-center gap-4">
        <Dial progress={progress(timer, now)} size={72} stroke={5} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
            {timer.label}
          </p>
          <p
            className="tnum text-4xl font-semibold tracking-tight"
            style={{ color: done ? 'var(--accent)' : 'var(--ink)' }}
          >
            {formatClock(remaining)}
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
      <div
        className="tick-ruler"
        style={{ '--progress': String(progress(timer, now)) } as React.CSSProperties}
      />
    </li>
  )
}
