/**
 * What the whole app wants the tab to say, from the whole state.
 *
 * The formatter (`buildTitle`) has always understood a priority list; what it
 * never had was a caller who could see all of it. Two views wrote the title —
 * whichever one you happened to be looking at — so a ringing countdown went
 * unannounced the moment you walked to another tool, and `ringingAlarm` had
 * no caller at all. The shell asks the question now, once, for every route.
 */
import { buildTimeline, phaseAt, totalMs } from '../engine/intervals.ts'
import type { TitleInput } from '../hooks/documentTitle.ts'
import type { AppState } from '../store/types.ts'
import { ringingAlarm } from '../tools/alarm/ringing.ts'
import { isRinging } from '../tools/countdown/ringing.ts'

export function titleInput(state: AppState, now: number): TitleInput {
  const timers = state.countdown.timers

  const alarm = ringingAlarm(state.alarms.alarms, now)
  if (alarm !== undefined) return { timers, ringingAlarm: alarm.time }

  const ringer = timers.find((timer) => isRinging(timer, now))
  if (ringer !== undefined) return { timers, ringingTimer: ringer.label }

  // Paused workouts do not hold the tab; only a running one does.
  const { interval } = state
  if (interval.startedAt !== undefined) {
    const timeline = buildTimeline(interval.config)
    const elapsed = now - interval.startedAt
    // `elapsed < total` also covers the empty timeline an all-zero config
    // builds, where there is no phase to look up.
    const phase = elapsed < totalMs(timeline) ? phaseAt(timeline, elapsed) : null
    if (phase !== null) {
      return {
        timers,
        interval: { phase: phase.kind, remainingMs: phase.endMs - elapsed },
      }
    }
  }

  return { timers }
}
