import { createContext, useContext } from 'react'
import type { Action } from './actions.ts'
import { defaultState } from './reducer.ts'
import type { AppState } from './types.ts'

export const StateContext = createContext<AppState>(defaultState('UTC'))
export const DispatchContext = createContext<React.Dispatch<Action>>(() => {})

export function useStore(): AppState {
  return useContext(StateContext)
}

export function useDispatch(): React.Dispatch<Action> {
  return useContext(DispatchContext)
}
