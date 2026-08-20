/**
 * Which alarm is ringing, right now.
 *
 * Nothing is scheduled: the question is asked of the engine on every tick, so
 * an occurrence missed during a reload or a throttled tab still rings (within
 * a quarter hour) and never rings twice. Ringing is derived — the only stored
 * facts are the occurrence an alarm last rang for and, if snoozed, when the
 * snooze ends.
 *
 * It lives apart from the watcher because the tab title asks the same
 * question from the shell, and two copies of this predicate would drift.
 */
import { lastTrigger } from '../../engine/alarm.ts'
import type { AlarmItem } from '../../store/types.ts'

/** How late an occurrence may be picked up before it is written off. */
export const CATCH_UP_MS = 15 * 60_000

export const SNOOZE_MS = 5 * 60_000

export function ringingAlarm(alarms: readonly AlarmItem[], now: number): AlarmItem | undefined {
  return alarms.find((alarm) => {
    if (!alarm.enabled) return false
    const last = lastTrigger(alarm, new Date(now))
    if (last === null || last <= (alarm.lastRangAt ?? 0)) return false

    const snoozedUntil = alarm.snoozedUntil ?? 0
    if (now < snoozedUntil) return false

    // The catch-up window runs from whatever is due — the occurrence, or the
    // end of a snooze. Measuring it from the original occurrence meant the
    // third snooze walked the alarm past its own fifteen-minute window, and
    // it never rang again, with nothing on screen to say so.
    if (now - Math.max(last, snoozedUntil) > CATCH_UP_MS) return false
    return true
  })
}
