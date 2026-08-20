interface GaugeProps {
  cells: number
  filled: number
  className?: string
}

/**
 * Time spent, as a row of lit cells — the strip of lamps along an
 * instrument's edge. Decorative by construction: the readout beside it
 * already carries the value, so this is `aria-hidden` and never the only
 * signal.
 *
 * Cells change in place: no remount, no animation, nothing to reduce.
 */
export function Gauge({ cells, filled, className = '' }: GaugeProps) {
  // A NaN reaches here whenever a caller divides by a zero-length total, and
  // NaN survives round/min/max untouched — straight into `data-filled`.
  const count = Number.isFinite(filled) ? Math.max(0, Math.min(cells, Math.round(filled))) : 0
  return (
    <span className={`gauge ${className}`.trim()} aria-hidden="true" data-filled={count}>
      {Array.from({ length: cells }, (_, index) => (
        // A fixed-length row of interchangeable slots: the index is the slot.
        // oxlint-disable-next-line react/no-array-index-key
        <span key={index} className="gauge-cell" data-on={index < count ? 'true' : 'false'} />
      ))}
    </span>
  )
}
