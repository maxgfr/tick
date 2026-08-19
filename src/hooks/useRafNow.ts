import { useEffect, useState } from 'react'

/**
 * Animation-frame time for the stopwatch's tenths: rAF when the tab is
 * visible, a plain interval fallback when it is not. Pauses entirely while
 * hidden beyond one final refresh — the accumulated timestamp stays true.
 */
export function useRafNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return

    let frame = 0
    let fallback = 0

    const tick = (): void => {
      setNow(Date.now())
      if (document.visibilityState === 'visible') {
        frame = requestAnimationFrame(tick)
      } else {
        fallback = window.setTimeout(tick, 250)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(fallback)
    }
  }, [running])

  return now
}
