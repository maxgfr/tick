import { useEffect } from 'react'
import { Button } from '../../components/Button.tsx'
import { FlipReadout } from '../../components/FlipReadout.tsx'
import { formatClock } from '../../engine/duration.ts'
import { useRafNow } from '../../hooks/useRafNow.ts'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { unlockAudio } from '../../lib/audio.ts'
import { useDispatch, useStore } from '../../store/context.ts'

/**
 * The stopwatch. The readout runs on animation frames for smooth tenths
 * while the tab is visible, but the source of truth is the accumulated
 * timestamp pair — pausing, reloading or backgrounding the tab never costs
 * or invents time.
 */
export function StopwatchView() {
  const { stopwatch } = useStore()
  const dispatch = useDispatch()

  const runningSince = stopwatch.runningSince
  const running = runningSince !== undefined
  const now = useRafNow(running)
  const elapsed = stopwatch.accumulatedMs + (runningSince !== undefined ? now - runningSince : 0)

  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useWakeLock(running)

  const lapCount = stopwatch.laps.length
  const deltas = stopwatch.laps.map((lap, index) => lap - (stopwatch.laps[index - 1] ?? 0))
  const fastest = lapCount > 1 ? Math.min(...deltas) : null
  const slowest = lapCount > 1 ? Math.max(...deltas) : null

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <output
        aria-label="Stopwatch"
        className="text-6xl sm:text-8xl"
        style={{ color: 'var(--ink)' }}
      >
        <FlipReadout text={formatClock(elapsed, { tenths: true })} />
      </output>

      <div className="flex gap-2">
        {running ? (
          <Button
            variant="primary"
            onClick={() => dispatch({ type: 'stopwatch/pause', now: Date.now() })}
          >
            Pause
          </Button>
        ) : (
          elapsed > 0 && (
            <Button
              variant="primary"
              onClick={() => dispatch({ type: 'stopwatch/start', now: Date.now() })}
            >
              Resume
            </Button>
          )
        )}
        {elapsed === 0 && (
          <Button
            variant="primary"
            onClick={() => dispatch({ type: 'stopwatch/start', now: Date.now() })}
          >
            Start
          </Button>
        )}
        <Button
          disabled={!running}
          title="Record a lap"
          onClick={() => dispatch({ type: 'stopwatch/lap', now: Date.now() })}
        >
          Lap
        </Button>
        <Button
          disabled={elapsed === 0 && lapCount === 0}
          onClick={() => dispatch({ type: 'stopwatch/reset' })}
        >
          Reset
        </Button>
      </div>

      {lapCount > 0 && (
        <ul className="w-full max-w-md" aria-label="Laps">
          {[...stopwatch.laps].reverse().map((lap, index) => {
            const lapNumber = lapCount - index
            const delta = deltas[lapCount - index - 1] ?? 0
            return (
              // Keyed by lap number, not by the elapsed value: two taps inside
              // the same millisecond produce identical elapsed times, and React
              // then has duplicate keys on rows that are genuinely distinct.
              <li
                key={lapNumber}
                className="tnum flex items-baseline justify-between border-b py-2"
                style={{ borderColor: 'var(--line)' }}
              >
                <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
                  #{lapNumber}
                </span>
                <span className="flex items-baseline gap-2">
                  <span style={{ color: 'var(--ink-2)' }}>
                    +{formatClock(delta, { tenths: true })}
                  </span>
                  <span className="text-lg font-medium" style={{ color: 'var(--ink)' }}>
                    {formatClock(lap, { tenths: true })}
                  </span>
                </span>
                <span className="w-16 text-right text-xs" style={{ color: 'var(--accent)' }}>
                  {delta === fastest && delta !== slowest ? 'fastest' : ''}
                  {delta === slowest && delta !== fastest ? 'slowest' : ''}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
