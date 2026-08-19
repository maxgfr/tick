import { useEffect, useReducer, useRef } from 'react'
import { DispatchContext, StateContext } from './context.ts'
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
 * State with exactly one job between renders: survive. Debounced writes keep
 * typing cheap; the pagehide flush means a closed tab has already saved.
 */
export function StoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    (): AppState => loadState(globalThis.localStorage?.getItem(STORAGE_KEY) ?? null, localZone()),
  )

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serialize(stateRef.current))
      } catch {
        // Private mode / quota: timers still run, they just do not persist.
      }
    }, 150)
    return () => clearTimeout(id)
  }, [state])

  useEffect(() => {
    const flush = (): void => {
      try {
        localStorage.setItem(STORAGE_KEY, serialize(stateRef.current))
      } catch {
        // See above.
      }
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  return (
    <StateContext value={state}>
      <DispatchContext value={dispatch}>{children}</DispatchContext>
    </StateContext>
  )
}
