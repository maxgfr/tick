/**
 * When a finished countdown is still ringing.
 *
 * A timer that beeps once is a timer you miss — the kettle boils in the next
 * room, the tab is in the background, the phone is face down. So a countdown
 * rings like an alarm clock: it keeps going until someone stops it.
 *
 * Ringing is derived, never stored. `silencedAt` is the only new fact, and it
 * records a decision the user made, not a state the app has to keep ticking.
 * That is what makes the ring survive a reload — and what stops a timer you
 * already dealt with from starting up again on the next one.
 */
import { isDone } from '../../engine/countdown.ts'
import type { CountdownItem } from '../../store/types.ts'

/** The gap between two rings — a nag, not a siren. */
export const RING_INTERVAL_MS = 1_500

/**
 * How long an unattended timer keeps ringing. Long enough to walk back from
 * another room, short enough that a laptop left alone does not beep all
 * afternoon — the same bargain the alarm's catch-up window strikes.
 */
export const RING_LIMIT_MS = 5 * 60_000

export function isRinging(timer: CountdownItem, now: number): boolean {
  if (!isDone(timer, now) || timer.silencedAt !== undefined) return false
  // `isDone` already proved `endAt` is set; the fallback is for the types.
  return now - (timer.endAt ?? 0) < RING_LIMIT_MS
}
