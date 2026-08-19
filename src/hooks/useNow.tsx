/**
 * One clock for the whole app.
 *
 * N timers must not mean N intervals. A single 250 ms tick re-renders
 * everything that reads `now`, and a visibility listener refreshes the instant
 * the tab comes back — which, combined with timestamp-derived timers, is why a
 * backgrounded countdown is still exact to the second it returns.
 */
import { createContext, useContext, useEffect, useState } from 'react'

const TickerContext = createContext<number>(0)

const TICK_MS = 250

export function TickerProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = (): void => setNow(Date.now())
    const id = setInterval(refresh, TICK_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return <TickerContext value={now}>{children}</TickerContext>
}

export function useNow(): number {
  return useContext(TickerContext)
}
