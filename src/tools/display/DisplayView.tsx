import { Button } from '../../components/Button.tsx'
import { Readout } from '../../components/Readout.tsx'
import { Gauge } from '../../components/Gauge.tsx'
import { progress as countdownProgress, remainingMs } from '../../engine/countdown.ts'
import { formatClock } from '../../engine/duration.ts'
import { buildTimeline, phaseAt, totalMs } from '../../engine/intervals.ts'
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
 * clock. The board is the display: giant tiles, a row filling underneath.
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
  // `buildTimeline` drops every zero-length phase, so an all-zero config
  // yields an empty timeline. `.at(-1)!` on it threw on every render of this
  // view — a white screen for the whole app, with no error boundary under it.
  const total = totalMs(timeline)
  const phase = active && total > 0 && elapsed < total ? phaseAt(timeline, elapsed) : null

  return (
    <section
      aria-label="Display"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6"
    >
      {timer !== undefined ? (
        <>
          <p
            className="font-display text-2xl font-semibold uppercase tracking-wide"
            style={{ color: 'var(--ink-2)' }}
          >
            {timer.label}
          </p>
          <p
            className="text-center"
            style={{ fontSize: 'clamp(3rem, 16vmin, 7rem)', color: 'var(--ink)' }}
          >
            <Readout text={formatClock(remainingMs(timer, now))} />
          </p>
          <Gauge
            cells={24}
            filled={countdownProgress(timer, now) * 24}
            className="w-full max-w-xl"
          />
        </>
      ) : phase !== null ? (
        <>
          <p
            className="font-display text-2xl font-semibold uppercase tracking-wide"
            style={{ color: 'var(--accent)' }}
          >
            {PHASE_LABEL[phase.kind]}
            {phase.round > 0 && ` · Round ${phase.round} of ${interval.config.rounds}`}
          </p>
          <p style={{ fontSize: 'clamp(3rem, 16vmin, 7rem)', color: 'var(--ink)' }}>
            <Readout text={formatClock(phase.endMs - elapsed)} />
          </p>
          <Gauge
            cells={24}
            filled={total > 0 ? (elapsed / total) * 24 : 0}
            className="w-full max-w-xl"
          />
        </>
      ) : (
        <WallClock now={now} />
      )}

      <div className="flex gap-3 pt-4">
        <Button onClick={() => toggleFullscreen()}>Fullscreen (F)</Button>
        <a
          href="#/"
          className="font-display flex items-center px-3 py-1.5 text-sm font-semibold uppercase tracking-wide"
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
    <p style={{ fontSize: 'clamp(4rem, 22vmin, 10rem)', color: 'var(--ink)' }}>
      <Readout
        text={`${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`}
      />
    </p>
  )
}
