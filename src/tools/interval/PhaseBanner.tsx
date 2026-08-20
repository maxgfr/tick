import { Readout } from '../../components/Readout.tsx'
import { Gauge } from '../../components/Gauge.tsx'
import { formatClock } from '../../engine/duration.ts'

interface PhaseBannerProps {
  banner: string
  remainingMs: number
  round?: string | undefined
  elapsedMs: number
  totalMs: number
}

/**
 * The across-the-room display: what you're doing on a printed tile, how much
 * of it is left on the board, and the workout as a row of tiles filling up.
 */
export function PhaseBanner({ banner, remainingMs, round, elapsedMs, totalMs }: PhaseBannerProps) {
  return (
    <section
      aria-label="Current phase"
      className="flex flex-col items-center gap-3 rounded-xs border p-8"
      style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}
    >
      <p className="py-1">
        <span
          className="font-display inline-block rounded-xs px-3 py-1 text-2xl font-bold uppercase tracking-wide"
          style={{ background: 'var(--tile)', color: 'var(--tile-ink)' }}
        >
          {banner}
        </span>
      </p>
      <p className="py-1 text-6xl sm:text-7xl" style={{ color: 'var(--ink)' }}>
        <Readout text={formatClock(remainingMs)} live />
      </p>
      {round && (
        <p
          className="font-display text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--ink-3)' }}
        >
          {round}
        </p>
      )}

      <Gauge
        cells={24}
        filled={totalMs > 0 ? (elapsedMs / totalMs) * 24 : 0}
        className="mt-2 w-full"
      />
      <p className="tnum text-xs" style={{ color: 'var(--ink-3)' }}>
        {formatClock(elapsedMs)} / {formatClock(totalMs)}
      </p>
    </section>
  )
}
