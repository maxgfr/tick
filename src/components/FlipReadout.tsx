interface FlipReadoutProps {
  text: string
  className?: string
}

/**
 * The board's readout: one tile per character, flat separators between groups.
 * The visible row is aria-hidden — a screen-reader twin carries the value in
 * one utterance.
 *
 * Tiles are keyed by position alone. Keying them by position *and* character
 * made every changed digit a new element so it could replay a flip animation,
 * which also meant a whole readout remounted on every route change and the
 * entire board turned over at once. There is no animation now, and nothing
 * remounts: the text inside a tile simply changes.
 */
export function FlipReadout({ text, className = '' }: FlipReadoutProps) {
  return (
    <>
      <span className={`flip-row ${className}`.trim()} aria-hidden="true">
        {[...text].map((char, index) =>
          char === ':' || char === '.' || char === ' ' ? (
            // The row is positional by construction — clock columns never
            // reorder — so the index is the identity of the slot.
            // oxlint-disable-next-line react/no-array-index-key
            <span key={index} className="flip-sep">
              {char}
            </span>
          ) : (
            // oxlint-disable-next-line react/no-array-index-key
            <span key={index} className="flap">
              {char}
            </span>
          ),
        )}
      </span>
      <span className="sr-only">{text}</span>
    </>
  )
}
