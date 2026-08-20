/**
 * What the tab title says while the app is not the front tab — which is
 * exactly when it matters most: the countdown you glance at in the tab bar.
 *
 * Priority: a ringing alarm, then a countdown still ringing, then the running
 * interval phase, then the soonest running countdown, then the app name.
 * Anything ringing outranks anything merely running — it is the one thing
 * asking to be dealt with.
 */
import { formatClock } from '../engine/duration.ts'
import { remainingMs } from '../engine/countdown.ts'
import type { PhaseKind } from '../engine/intervals.ts'
import type { CountdownItem } from '../store/types.ts'

export interface TitleInput {
  timers: CountdownItem[]
  interval?: { phase: PhaseKind; remainingMs: number }
  ringingAlarm?: string
  /** Label of a countdown that has hit zero and is still ringing. */
  ringingTimer?: string
}

const PHASE_LABEL: Record<PhaseKind, string> = {
  prepare: 'READY',
  work: 'WORK',
  rest: 'REST',
  cooldown: 'COOL',
}

export function buildTitle(input: TitleInput, now: number): string {
  if (input.ringingAlarm !== undefined) return `⏰ ${input.ringingAlarm} · tick`
  if (input.ringingTimer !== undefined) return `⏰ ${input.ringingTimer} · tick`

  if (input.interval) {
    const label = PHASE_LABEL[input.interval.phase]
    return `${label} · ${formatClock(input.interval.remainingMs)} · tick`
  }

  const running = input.timers
    .filter((timer) => timer.endAt !== undefined && timer.endAt > now)
    .map((timer) => remainingMs(timer, now))
    .sort((a, b) => a - b)[0]

  if (running !== undefined) return `${formatClock(running)} · tick`

  return 'tick'
}
