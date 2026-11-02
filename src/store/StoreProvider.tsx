import { useEffect, useReducer, useRef, useState } from 'react'
import { DispatchContext, PersistedContext, StateContext } from './context.ts'
import { loadState, serialize, STORAGE_KEY } from './persist.ts'
import { reducer } from './reducer.ts'
import type { AppState } from './types.ts'

const localZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * One write of the whole state. False when it did not land: private mode, or
 * the quota is full — and the quota is shared with every other site of
 * maxgfr.github.io, so another app can fill it without tick doing anything.
 */
const save = (state: AppState): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state))
    return true
  } catch {
    return false
  }
}

/**
 * State with exactly one job between renders: survive. Debounced writes keep
 * typing cheap; the pagehide flush means a closed tab has already saved.
 */
export function StoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, undefined, (): AppState =>
    loadState(globalThis.localStorage?.getItem(STORAGE_KEY) ?? null, localZone()),
  )

  const [persisted, setPersisted] = useState(true)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    // When it fails, timers still run; they just do not persist — and the
    // shell says so instead of letting the user believe they will.
    const id = setTimeout(() => setPersisted(save(stateRef.current)), 150)
    return () => clearTimeout(id)
  }, [state])

  useEffect(() => {
    const flush = (): void => {
      save(stateRef.current)
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  return (
    <StateContext value={state}>
      <DispatchContext value={dispatch}>
        <PersistedContext value={persisted}>{children}</PersistedContext>
      </DispatchContext>
    </StateContext>
  )
}
