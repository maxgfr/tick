import { Button } from '../../components/Button.tsx'
import { cityOf, MAX_PARTICIPANTS, type MeetingParticipant } from '../../engine/meeting.ts'
import { CURATED_ZONES } from '../../engine/timezones.ts'
import { useDispatch } from '../../store/context.ts'

const hhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const minutesOf = (value: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * The roster. Each row is a person: where they are, what to call them, and
 * the hours they actually work — which is the only input the whole grid needs.
 *
 * The first row anchors the grid, so it can be reordered but never removed.
 */
export function ParticipantList({ participants }: { participants: readonly MeetingParticipant[] }) {
  const dispatch = useDispatch()
  const full = participants.length >= MAX_PARTICIPANTS

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2" aria-label="Participants">
        {participants.map((participant, index) => {
          const name =
            participant.label.trim() === '' ? cityOf(participant.zoneId) : participant.label
          return (
            <li
              key={participant.id}
              className="flex flex-wrap items-center gap-2 rounded-xs border p-3"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
            >
              {index === 0 && (
                <span
                  className="font-display text-xs font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--accent)' }}
                >
                  Anchor
                </span>
              )}

              <label
                className="flex min-w-0 flex-1 flex-col text-xs"
                style={{ color: 'var(--ink-3)' }}
              >
                <span className="sr-only">Name for {cityOf(participant.zoneId)}</span>
                <input
                  type="text"
                  value={participant.label}
                  placeholder={cityOf(participant.zoneId)}
                  aria-label={`Name for ${cityOf(participant.zoneId)}`}
                  onChange={(event) =>
                    dispatch({
                      type: 'meeting/participant/label',
                      id: participant.id,
                      label: event.target.value,
                    })
                  }
                  className="w-full rounded-xs border bg-transparent px-2 py-1.5 text-sm"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                />
              </label>

              <label className="flex flex-col text-xs" style={{ color: 'var(--ink-3)' }}>
                <span className="sr-only">Timezone for {name}</span>
                <select
                  value={participant.zoneId}
                  aria-label={`Timezone for ${name}`}
                  onChange={(event) =>
                    dispatch({
                      type: 'meeting/participant/zone',
                      id: participant.id,
                      zoneId: event.target.value,
                    })
                  }
                  className="rounded-xs border px-2 py-1.5 text-sm"
                  style={{
                    borderColor: 'var(--line)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                >
                  {CURATED_ZONES.map((group) => (
                    <optgroup key={group.region} label={group.region}>
                      {group.zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.city}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {/* A zone from a shared link may sit outside the curated list. */}
                  {!CURATED_ZONES.some((group) =>
                    group.zones.some((zone) => zone.id === participant.zoneId),
                  ) && <option value={participant.zoneId}>{cityOf(participant.zoneId)}</option>}
                </select>
              </label>

              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-3)' }}>
                <input
                  type="time"
                  step={1800}
                  value={hhmm(participant.startMin)}
                  aria-label={`Working from, for ${name}`}
                  onChange={(event) => {
                    const startMin = minutesOf(event.target.value)
                    if (startMin === null) return
                    dispatch({
                      type: 'meeting/participant/hours',
                      id: participant.id,
                      startMin,
                      endMin: participant.endMin,
                    })
                  }}
                  className="tnum rounded-xs border bg-transparent px-2 py-1.5 text-sm"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                />
                <span aria-hidden="true">–</span>
                <input
                  type="time"
                  step={1800}
                  value={hhmm(participant.endMin)}
                  aria-label={`Working until, for ${name}`}
                  onChange={(event) => {
                    const endMin = minutesOf(event.target.value)
                    if (endMin === null) return
                    dispatch({
                      type: 'meeting/participant/hours',
                      id: participant.id,
                      startMin: participant.startMin,
                      endMin,
                    })
                  }}
                  className="tnum rounded-xs border bg-transparent px-2 py-1.5 text-sm"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                />
              </span>

              <span className="ml-auto flex shrink-0 gap-1">
                <Button
                  ariaLabel={`Move ${name} up`}
                  title={`Move ${name} up`}
                  disabled={index === 0}
                  onClick={() =>
                    dispatch({ type: 'meeting/participant/move', id: participant.id, delta: -1 })
                  }
                >
                  ↑
                </Button>
                <Button
                  ariaLabel={`Move ${name} down`}
                  title={`Move ${name} down`}
                  disabled={index === participants.length - 1}
                  onClick={() =>
                    dispatch({ type: 'meeting/participant/move', id: participant.id, delta: 1 })
                  }
                >
                  ↓
                </Button>
                <Button
                  variant="danger"
                  ariaLabel={`Remove ${name}`}
                  title={index === 0 ? 'The first row anchors the grid' : `Remove ${name}`}
                  disabled={participants.length <= 1 || index === 0}
                  onClick={() =>
                    dispatch({ type: 'meeting/participant/remove', id: participant.id })
                  }
                >
                  ×
                </Button>
              </span>
            </li>
          )
        })}
      </ul>

      <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--ink-2)' }}>
        {full ? `Eight people is the most this grid can read` : 'Add someone'}
        <select
          value=""
          disabled={full}
          aria-label="Add a participant"
          onChange={(event) => {
            if (event.target.value === '') return
            dispatch({ type: 'meeting/participant/add', zoneId: event.target.value })
          }}
          className="max-w-xs rounded-xs border px-3 py-2 disabled:opacity-40"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
        >
          <option value="">Choose a city…</option>
          {CURATED_ZONES.map((group) => (
            <optgroup key={group.region} label={group.region}>
              {group.zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.city}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  )
}
