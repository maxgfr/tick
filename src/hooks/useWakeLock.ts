import { useEffect } from 'react'

/**
 * Keep the screen awake while something runs — the point of a kitchen timer
 * you can see across the room. Wake Lock is a courtesy, not a dependency:
 * unsupported browsers and hidden tabs simply release it, and the timers
 * themselves are timestamp-derived and stay exact regardless.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator.wakeLock !== 'object') return

    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false

    const acquire = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        // Denied or unsupported: nothing to do.
      }
    }

    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
      lock = null
    }
  }, [active])
}
