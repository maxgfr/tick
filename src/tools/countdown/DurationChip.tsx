import { formatClock } from '../../engine/duration.ts'

/**
 * A duration you can start with one tap, and drop with one more.
 *
 * Presets and recent durations are the same object to a thumb — a label, a
 * time, and a way to be rid of it — so they are the same component. The only
 * difference is where the list comes from.
 */
export function DurationChip({
  label,
  durationMs,
  removeLabel,
  onStart,
  onRemove,
}: {
  /** Absent for a duration nobody has named — the time is the whole chip. */
  label?: string | undefined
  durationMs: number
  removeLabel: string
  onStart: () => void
  onRemove: () => void
}) {
  return (
    <li
      className="flex items-center overflow-hidden rounded-xs border"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
    >
      <button
        type="button"
        className="touch-target px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
        style={{ color: 'var(--ink)' }}
        onClick={onStart}
      >
        {/* A real space, not just a margin: without it the accessible name
            runs the two together as "Pasta11:00". */}
        {label === undefined ? null : `${label} `}
        <span
          className={label === undefined ? 'tnum' : 'tnum ml-2'}
          style={{ color: label === undefined ? 'var(--ink)' : 'var(--ink-3)' }}
        >
          {formatClock(durationMs)}
        </span>
      </button>
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        className="touch-target px-2 py-1.5 text-xs transition-colors hover:bg-[var(--surface-2)]"
        style={{ color: 'var(--ink-3)' }}
        onClick={onRemove}
      >
        ×
      </button>
    </li>
  )
}
