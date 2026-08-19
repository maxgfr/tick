import { formatClock } from '../../engine/duration.ts'
import type { Phase } from '../../engine/intervals.ts'

interface PhaseBannerProps {
  banner: string
  remainingMs: number
  round?: string | undefined
  elapsedMs: number
  totalMs: number
  timeline: Phase[]
}

const PHASE_COLOR: Record<Phase['kind'], string> = {
  prepare: 'var(--ink-2)',
  work: 'var(--accent)',
  rest: 'var(--ink)',
  cooldown: 'var(--ink-2)',
}

/**
 * The across-the-room display: what you're doing, how much of it is left,
 * and where you are in the workout as a whole.
 */
export function PhaseBanner({
  banner,
  remainingMs,
  round,
  elapsedMs,
  totalMs,
  timeline,
}: PhaseBannerProps) {
  return (
    <section
      aria-label="Current phase"
      className="flex flex-col items-center gap-3 rounded-xl border p-8"
      style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}
    >
      <p className="text-5xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
        {banner}
      </p>
      <p className="tnum text-6xl font-semibold" style={{ color: 'var(--ink)' }}>
        {formatClock(remainingMs)}
      </p>
      {round && (
        <p className="text-sm uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
          {round}
        </p>
      )}

      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full" aria-hidden="true">
        {timeline.map((phase) => (
          <div
            key={`${phase.kind}-${phase.round}-${phase.startMs}`}
            style={{
              flexGrow: phase.endMs - phase.startMs,
              background: PHASE_COLOR[phase.kind],
              opacity: phase.endMs <= elapsedMs ? 1 : 0.25,
            }}
          />
        ))}
      </div>
      <p className="tnum text-xs" style={{ color: 'var(--ink-3)' }}>
        {formatClock(elapsedMs)} / {formatClock(totalMs)}
      </p>
    </section>
  )
}
