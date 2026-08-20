import { useMemo, useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { FlipReadout } from '../../components/FlipReadout.tsx'
import { CURATED_ZONES, offsetMs, zonedParts } from '../../engine/timezones.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useDispatch, useStore } from '../../store/context.ts'

const cityFor = (zoneId: string): string => {
  for (const group of CURATED_ZONES) {
    const zone = group.zones.find((candidate) => candidate.id === zoneId)
    if (zone) return zone.city
  }
  return zoneId.split('/').pop()?.replaceAll('_', ' ') ?? zoneId
}

const localZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** "+2h", "−9h", "+5.5h" — the difference from the zone you are standing in. */
const offsetLabel = (deltaMs: number): string => {
  if (deltaMs === 0) return 'same time as you'
  const hours = deltaMs / 3_600_000
  const sign = hours > 0 ? '+' : '−'
  const text = Math.abs(hours) % 1 === 0 ? `${Math.abs(hours)}h` : `${Math.abs(hours).toFixed(1)}h`
  return `${sign}${text}`
}

/**
 * The world clock: a handful of zones the user actually cares about, each
 * rendered from the platform's own timezone tables — DST included, zero
 * bytes of timezone data shipped.
 */
export function WorldClockView() {
  const { world } = useStore()
  const dispatch = useDispatch()
  const now = useNow()
  const [pickerValue, setPickerValue] = useState('')

  const home = useMemo(() => localZone(), [])
  const date = new Date(now)
  const homeOffset = offsetMs(home, date)

  const add = (zoneId: string): void => {
    if (!zoneId) return
    dispatch({ type: 'world/add', zoneId })
    setPickerValue('')
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--ink-2)' }}>
        Add a timezone
        <select
          value={pickerValue}
          onChange={(event) => add(event.target.value)}
          className="max-w-xs rounded-xs border px-3 py-2"
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

      <ul className="flex flex-col gap-2" aria-label="World clocks">
        {world.zoneIds.map((zoneId, index) => {
          const parts = zonedParts(zoneId, date)
          const isDay = parts.hour >= 7 && parts.hour < 19
          const time = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
          const delta = offsetMs(zoneId, date) - homeOffset
          const city = cityFor(zoneId)

          return (
            <li
              key={zoneId}
              className="flex items-center gap-4 rounded-xs border p-4"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
            >
              <span title={isDay ? 'Daytime' : 'Night'} className="text-xl" aria-hidden="true">
                {isDay ? '☀' : '☾'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium" style={{ color: 'var(--ink)' }}>
                  {city}
                </p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  {zoneId} · {offsetLabel(delta)}
                </p>
              </div>
              <p className="text-3xl" style={{ color: 'var(--ink)' }}>
                <FlipReadout text={time} />
              </p>
              <div className="flex shrink-0 gap-1">
                <Button
                  ariaLabel={`Move ${city} up`}
                  title={`Move ${city} up`}
                  disabled={index === 0}
                  onClick={() => dispatch({ type: 'world/move', zoneId, delta: -1 })}
                >
                  ↑
                </Button>
                <Button
                  ariaLabel={`Move ${city} down`}
                  title={`Move ${city} down`}
                  disabled={index === world.zoneIds.length - 1}
                  onClick={() => dispatch({ type: 'world/move', zoneId, delta: 1 })}
                >
                  ↓
                </Button>
                <Button
                  variant="danger"
                  ariaLabel={`Remove ${city}`}
                  title={`Remove ${city}`}
                  onClick={() => dispatch({ type: 'world/remove', zoneId })}
                >
                  ×
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      {world.zoneIds.length === 0 && (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          No clocks yet — add a city above and it stays, across reloads.
        </p>
      )}
    </div>
  )
}
