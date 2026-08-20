import { Dial } from '../../components/Dial.tsx'
import { progress as countdownProgress, remainingMs } from '../../engine/countdown.ts'
import { formatClock } from '../../engine/duration.ts'
import { buildTimeline, phaseAt } from '../../engine/intervals.ts'
import type { Phase } from '../../engine/intervals.ts'
import { zonedParts } from '../../engine/timezones.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { toggleFullscreen } from '../../lib/fullscreen.ts'
import { useStore } from '../../store/context.ts'

const PHASE_LABEL: Record<Phase['kind'], string> = {
  prepare: 'READY',
  work: 'WORK',
  rest: 'REST',
  cooldown: 'COOL',
}

/**
 * The across-the-room view. It picks its own source — whatever is most
 * urgent right now — so walking over to the big screen never means choosing
 * a screen: the soonest countdown wins, then a running workout, then the
 * clock.
 */
export function DisplayView() {
  const { countdown, interval } = useStore()
  const now = useNow()
  useWakeLock(true)

  const running = countdown.timers
    .filter((timer) => timer.endAt !== undefined && now < timer.endAt)
    .toSorted((a, b) => (a.endAt ?? 0) - (b.endAt ?? 0))
  const timer = running[0]

  const elapsed =
    interval.pausedElapsedMs ?? (interval.startedAt !== undefined ? now - interval.startedAt : 0)
  const active = interval.startedAt !== undefined || interval.pausedElapsedMs !== undefined
  const timeline = buildTimeline(interval.config)
  const phase = active && elapsed < timeline.at(-1)!.endMs ? phaseAt(timeline, elapsed) : null

  return (
    <section
      aria-label="Display"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6"
    >
      {timer !== undefined ? (
        <>
          <p className="text-2xl" style={{ color: 'var(--ink-2)' }}>
            {timer.label}
          </p>
          <div className="relative flex items-center justify-center">
            <Dial progress={countdownProgress(timer, now)} size={384} stroke={10} />
            <p
              className="tnum absolute font-bold tracking-tight"
              style={{ fontSize: 'clamp(3rem, 16vmin, 7rem)', color: 'var(--ink)' }}
            >
              {formatClock(remainingMs(timer, now))}
            </p>
          </div>
        </>
      ) : phase !== null ? (
        <>
          <p className="text-2xl font-semibold tracking-wide" style={{ color: 'var(--accent)' }}>
            {PHASE_LABEL[phase.kind]}
            {phase.round > 0 && ` · Round ${phase.round} of ${interval.config.rounds}`}
          </p>
          <p
            className="tnum font-bold tracking-tight"
            style={{ fontSize: 'clamp(3rem, 16vmin, 7rem)', color: 'var(--ink)' }}
          >
            {formatClock(phase.endMs - elapsed)}
          </p>
        </>
      ) : (
        <WallClock now={now} />
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => toggleFullscreen()}
          className="rounded-md border px-4 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--line)' }}
        >
          Fullscreen (F)
        </button>
        <a
          href="#/"
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{ color: 'var(--ink-3)' }}
        >
          ← tick
        </a>
      </div>
    </section>
  )
}

function WallClock({ now }: { now: number }) {
  const parts = zonedParts(Intl.DateTimeFormat().resolvedOptions().timeZone, new Date(now))
  return (
    <p
      className="tnum font-bold tracking-tight"
      style={{ fontSize: 'clamp(4rem, 22vmin, 10rem)', color: 'var(--ink)' }}
    >
      {String(parts.hour).padStart(2, '0')}:{String(parts.minute).padStart(2, '0')}
    </p>
  )
}
