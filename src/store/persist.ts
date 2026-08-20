/**
 * State persistence.
 *
 * localStorage, one key, the whole app state. Save is debounced and flushed
 * on pagehide by the provider; this module only knows how to serialize and —
 * more importantly — how to load without ever throwing: corrupted or older
 * storage degrades to defaults slice by slice, never to a blank screen.
 */
import { defaultState } from './reducer.ts'
import type { AppState } from './types.ts'

export const STORAGE_KEY = 'tick:state:v1'

export function serialize(state: AppState): string {
  return JSON.stringify(state)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * What each slice must look like before it is allowed to replace a default.
 *
 * `typeof value === 'object'` on its own is not a shape check: it accepts
 * `{}`, and it accepts arrays. A backup holding `{"countdown":{}}` was adopted
 * verbatim, `timers.some(...)` threw on undefined, and with the bad state
 * already written to localStorage the reload did it again — a permanent white
 * screen from a file the import dialog invited the user to pick.
 *
 * These guards are deliberately shallow: enough that no view reaches into
 * undefined, never so strict that a slice from an older build is thrown away.
 */
const SLICE_GUARDS: Record<Exclude<keyof AppState, 'version'>, (value: unknown) => boolean> = {
  settings: isRecord,
  countdown: (v) => isRecord(v) && Array.isArray(v.timers) && Array.isArray(v.presets),
  stopwatch: (v) => isRecord(v) && typeof v.accumulatedMs === 'number' && Array.isArray(v.laps),
  interval: (v) => isRecord(v) && isRecord(v.config),
  metronome: (v) => isRecord(v) && typeof v.bpm === 'number' && typeof v.beatsPerBar === 'number',
  world: (v) => isRecord(v) && Array.isArray(v.zoneIds),
  meeting: (v) => isRecord(v) && Array.isArray(v.participants) && typeof v.durationMin === 'number',
  alarms: (v) => isRecord(v) && Array.isArray(v.alarms),
}

/**
 * Merge rules, per top-level slice: a stored slice wins only if it still has
 * the shape the app reads; anything missing or malformed falls back to the
 * default. Unknown top-level fields are dropped — the state is exactly what
 * AppState says.
 */
export function loadState(raw: string | null, localZone: string): AppState {
  const fallback = defaultState(localZone)
  if (raw === null || raw === '') return fallback

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return fallback
  }
  if (!isRecord(data)) return fallback

  const merged: AppState = { ...fallback }
  for (const key of Object.keys(fallback) as (keyof AppState)[]) {
    // The version field is a literal, not a slice — it stays at whatever the
    // code understands.
    if (key === 'version') continue
    const value = data[key]
    if (!SLICE_GUARDS[key](value)) continue
    ;(merged as unknown as Record<string, unknown>)[key] = value
  }

  // Settings tolerate missing keys: an older build simply had fewer of them,
  // and a half-filled settings object must not leave the volume undefined.
  merged.settings = { ...fallback.settings, ...merged.settings }
  return merged
}
