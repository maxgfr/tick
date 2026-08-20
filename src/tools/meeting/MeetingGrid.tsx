import { cityOf, type Grid, type MeetingParticipant } from '../../engine/meeting.ts'

/**
 * Three grades, three grounds. `off` is a recess, not air: leaving it
 * transparent made the night hours read as loose text and the grid stopped
 * looking like a grid at all.
 */
const TONE: Record<string, { background: string; color: string }> = {
  working: { background: 'var(--accent)', color: 'var(--accent-ink)' },
  fringe: { background: 'var(--surface-2)', color: 'var(--ink)' },
  off: { background: 'var(--cell)', color: 'var(--ink-3)' },
}

/**
 * The day, half-hour by half-hour, as a real table: rows are slots, columns
 * are people. Every cell says what that person's own clock reads at that
 * moment and how their day is going — so the grid answers "find us a slot"
 * and "what time is that for them" in the same glance.
 *
 * Rows rather than columns because a phone scrolls vertically by nature, and
 * twenty-four hours across 375 pixels cannot be read at all.
 */
export function MeetingGrid({
  grid,
  participants,
  selectedAt,
  onSelect,
}: {
  grid: Grid
  participants: readonly MeetingParticipant[]
  selectedAt: number | null
  onSelect: (startMs: number) => void
}) {
  if (grid.slots.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
        Add someone to see the day.
      </p>
    )
  }

  const nameOf = (participant: MeetingParticipant): string =>
    participant.label.trim() === '' ? cityOf(participant.zoneId) : participant.label

  return (
    <div
      className="overflow-x-auto rounded-xs border"
      style={{ borderColor: 'var(--line)', maxHeight: '70vh', overflowY: 'auto' }}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          {`Availability on ${grid.day}, half-hour by half-hour, in each participant's local time`}
        </caption>
        <thead className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
          <tr>
            {/* Not the anchor's city: that is already the first participant
                column, and printing it twice reads as a duplicate row. */}
            <th
              scope="col"
              className="font-display px-2 py-2 text-left text-xs font-semibold tracking-wide uppercase"
              style={{ color: 'var(--ink-3)' }}
            >
              Time
            </th>
            {participants.map((participant) => (
              <th
                key={participant.id}
                scope="col"
                className="font-display px-2 py-2 text-left text-xs font-semibold tracking-wide uppercase"
                style={{ color: 'var(--ink-3)' }}
              >
                {nameOf(participant)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.slots.map((slot) => {
            const selected = selectedAt === slot.startMs
            return (
              <tr
                key={slot.startMs}
                style={{
                  outline: selected ? '2px solid var(--accent)' : undefined,
                  outlineOffset: '-2px',
                }}
              >
                <th
                  scope="row"
                  className="tnum px-2 py-1 text-left font-normal whitespace-nowrap"
                  style={{ color: 'var(--ink-2)' }}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(slot.startMs)}
                    className="touch-target w-full px-1 text-left"
                  >
                    {slot.anchorTime}
                    <span className="sr-only">
                      {` — ${
                        slot.verdict === 'all'
                          ? 'everyone is working'
                          : slot.verdict === 'stretch'
                            ? 'a stretch for someone'
                            : 'outside someone’s hours'
                      }`}
                    </span>
                  </button>
                </th>
                {slot.participants.map((cell) => (
                  <td key={cell.id} className="p-0.5">
                    <span
                      className="tnum flex h-7 items-center justify-center rounded-xs px-1 text-xs"
                      style={TONE[cell.availability]}
                      title={cell.availability}
                    >
                      {cell.time}
                      {cell.dayOffset !== 0 && (
                        <span className="pl-1 text-[0.625rem]">
                          {cell.dayOffset > 0
                            ? `+${String(cell.dayOffset)}`
                            : String(cell.dayOffset)}
                        </span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
