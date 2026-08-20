import { Button } from '../../components/Button.tsx'
import { Readout } from '../../components/Readout.tsx'
import { Gauge } from '../../components/Gauge.tsx'
import { formatClock, formatHuman } from '../../engine/duration.ts'
import { isDone, progress, remainingMs } from '../../engine/countdown.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useDispatch, useStore } from '../../store/context.ts'
import { isRinging } from './ringing.ts'

/**
 * One countdown. Everything on screen — readout, tile row, buttons — is
 * derived from `now` on each tick; the card holds no time of its own.
 *
 * Nothing happens here when a timer crosses zero — no beep, no notification,
 * not even the `fired` mark. All of it belongs to `CountdownWatcher`, which
 * is mounted whether or not this board is on screen; a card that owned its
 * own alarm was an alarm that stopped existing when you changed tool. What
 * the card owns is the Stop, one timer at a time.
 */
export function TimerCard({ id }: { id: string }) {
  const now = useNow()
  const dispatch = useDispatch()
  const { countdown } = useStore()

  const timer = countdown.timers.find((candidate) => candidate.id === id)
  if (!timer) return null

  const done = isDone(timer, now)

  const running = !done && timer.pausedRemainingMs === undefined && timer.endAt !== undefined
  const ringing = isRinging(timer, now)

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
            <Readout text={formatClock(remaining)} live={done} />
          </p>
          {done && (
            <p className="text-xs" style={{ color: ringing ? 'var(--accent)' : 'var(--ink-3)' }}>
              {ringing ? "Ringing — time's up" : `Done — ${formatHuman(timer.totalMs)} elapsed`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {/* First in the column, and the only filled button on the card:
              while it rings, stopping it is the one thing being asked for. */}
          {ringing && (
            <Button
              variant="primary"
              onClick={() => dispatch({ type: 'countdown/silence', id: timer.id, now: Date.now() })}
            >
              Stop
            </Button>
          )}
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
      <Gauge cells={24} filled={progress(timer, now) * 24} className="w-full" />
    </li>
  )
}
