interface ReadoutProps {
  text: string
  /** Live values print inverted — the safelight floods the cell. */
  live?: boolean
  className?: string
}

/**
 * The instrument's readout: one luminous figure per cell, separators bare
 * between groups. The visible row is aria-hidden — a screen-reader twin
 * carries the whole value in one utterance, so a clock is heard as "1:00" and
 * not as "one colon zero zero".
 *
 * Cells are keyed by position alone. Keying them by position *and* character
 * made every changed digit a new element so it could replay a flip animation,
 * which also meant a whole readout remounted on every route change and the
 * entire display turned over at once. There is no animation now, and nothing
 * remounts: the figure inside a cell simply changes.
 */
export function Readout({ text, live = false, className = '' }: ReadoutProps) {
  return (
    <>
      <span className={`readout ${className}`.trim()} aria-hidden="true">
        {[...text].map((char, index) =>
          char === ':' || char === '.' || char === ' ' ? (
            // The row is positional by construction — clock columns never
            // reorder — so the index is the identity of the slot.
            // oxlint-disable-next-line react/no-array-index-key
            <span key={index} className="readout-sep">
              {char}
            </span>
          ) : (
            // oxlint-disable-next-line react/no-array-index-key
            <span key={index} className="cell" data-live={live ? 'true' : 'false'}>
              {char}
            </span>
          ),
        )}
      </span>
      <span className="sr-only">{text}</span>
    </>
  )
}
