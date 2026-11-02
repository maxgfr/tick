import { createContext, useContext } from 'react'
import type { Action } from './actions.ts'
import { defaultState } from './reducer.ts'
import type { AppState } from './types.ts'

export const StateContext = createContext<AppState>(defaultState('UTC'))
export const DispatchContext = createContext<React.Dispatch<Action>>(() => {})
/** False once a save failed: the state on screen will not survive a reload. */
export const PersistedContext = createContext(true)

export function useStore(): AppState {
  return useContext(StateContext)
}

export function useDispatch(): React.Dispatch<Action> {
  return useContext(DispatchContext)
}

export function usePersisted(): boolean {
  return useContext(PersistedContext)
}
