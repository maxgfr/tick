interface FlipReadoutProps {
  text: string
  className?: string
}

/**
 * The board's readout: one flap per digit, flat separators between groups.
 * The visible row is aria-hidden — a screen-reader twin carries the value in
 * one utterance — and every tile is keyed by position and digit, so only a
 * changed digit remounts and flips.
 */
export function FlipReadout({ text, className = '' }: FlipReadoutProps) {
  return (
    <>
      <span className={`flip-row ${className}`.trim()} aria-hidden="true">
        {[...text].map((char, index) =>
          char === ':' || char === '.' || char === ' ' ? (
            // The list is positional by construction (clock columns never
            // reorder) and the key must change with the digit — position and
            // character together are the identity of a flipping tile.
            // oxlint-disable-next-line react/no-array-index-key
            <span key={`${index}-${char}`} className="flip-sep">
              {char}
            </span>
          ) : (
            // oxlint-disable-next-line react/no-array-index-key
            <span key={`${index}-${char}`} className="flap flap-turn">
              {char}
            </span>
          ),
        )}
      </span>
      <span className="sr-only">{text}</span>
    </>
  )
}
