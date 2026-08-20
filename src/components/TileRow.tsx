interface TileRowProps {
  cells: number
  filled: number
  className?: string
}

/**
 * Progress as a row of small tiles: filled cells are the vermilion spent.
 * Cells morph in place (no remount, no animation) — the flip belongs to
 * digits, progress just fills.
 */
export function TileRow({ cells, filled, className = '' }: TileRowProps) {
  const count = Math.max(0, Math.min(cells, Math.round(filled)))
  return (
    <span className={`tile-row ${className}`.trim()} aria-hidden="true" data-filled={count}>
      {Array.from({ length: cells }, (_, index) => (
        // A fixed-length row of interchangeable slots: the index is the slot.
        // oxlint-disable-next-line react/no-array-index-key
        <span key={index} className="tile-cell" data-on={index < count ? 'true' : 'false'} />
      ))}
    </span>
  )
}
