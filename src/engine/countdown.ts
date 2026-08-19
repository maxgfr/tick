/**
 * Countdown state machine.
 *
 * The timer never counts: it remembers when it will finish (`endAt`) or what
 * it had left when paused (`pausedRemainingMs`), and every displayed value is
 * derived from `now` at read time. That is what makes a countdown survive a
 * backgrounded tab, a reload, or a throttled interval without drifting — the
 * next render after any gap is still exact.
 */
export interface CountdownTimer {
  totalMs: number
  /** Timestamp (Date.now()) at which the timer fires. Absent while paused/idle. */
  endAt?: number
  /** Milliseconds frozen at pause time. Absent while running/idle. */
  pausedRemainingMs?: number
}

export function remainingMs(timer: CountdownTimer, now: number): number {
  if (timer.pausedRemainingMs !== undefined) return timer.pausedRemainingMs
  if (timer.endAt !== undefined) return Math.max(0, timer.endAt - now)
  return timer.totalMs
}

export function isDone(timer: CountdownTimer, now: number): boolean {
  return timer.endAt !== undefined && now >= timer.endAt
}

/** Elapsed fraction of the total, clamped to [0, 1] — drives the progress ring. */
export function progress(timer: CountdownTimer, now: number): number {
  const left = remainingMs(timer, now)
  if (timer.totalMs <= 0) return 1
  return Math.min(1, Math.max(0, (timer.totalMs - left) / timer.totalMs))
}

export function start(timer: CountdownTimer, now: number): CountdownTimer {
  const { totalMs } = timer
  return { totalMs, endAt: now + totalMs }
}

export function pause(timer: CountdownTimer, now: number): CountdownTimer {
  const { totalMs, pausedRemainingMs } = timer
  if (pausedRemainingMs !== undefined) return { totalMs, pausedRemainingMs }
  return { totalMs, pausedRemainingMs: remainingMs(timer, now) }
}

export function resume(timer: CountdownTimer, now: number): CountdownTimer {
  const { totalMs, pausedRemainingMs } = timer
  const left = pausedRemainingMs ?? timer.totalMs
  return { totalMs, endAt: now + left }
}
