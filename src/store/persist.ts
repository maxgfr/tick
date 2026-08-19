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

/**
 * Merge rules, per top-level slice: if stored data has the slice and it is an
 * object/array, it wins; anything missing falls back to the default. Unknown
 * top-level fields are dropped — the state is exactly what AppState says.
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
  if (typeof data !== 'object' || data === null) return fallback

  const stored = data as Record<string, unknown>
  const merged: AppState = { ...fallback }
  for (const key of Object.keys(fallback) as (keyof AppState)[]) {
    const value = stored[key]
    if (value !== null && typeof value === 'object') {
      // The version field is a literal, not an object — it stays at whatever
      // the code understands.
      if (key === 'version') continue
      ;(merged as unknown as Record<string, unknown>)[key] = value
    }
  }
  return merged
}
