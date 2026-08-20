import type { CountdownTimer } from '../engine/countdown.ts'
import type { IntervalConfig } from '../engine/intervals.ts'
import type { MeetingParticipant } from '../engine/meeting.ts'

export type Theme = 'system' | 'light' | 'dark'

export interface Preset {
  id: string
  label: string
  durationMs: number
}

export interface CountdownItem extends CountdownTimer {
  id: string
  label: string
  /** Set once when the timer fires — the notification dedupe. */
  firedAt?: number
}

export interface AlarmItem {
  id: string
  time: string
  /** 0 (Sunday) to 6 (Saturday). Empty means every day. */
  days: number[]
  enabled: boolean
  /** Timestamp of the occurrence this alarm last rang for (dismissed). */
  lastRangAt?: number
  /**
   * When a snooze ends. Persisted, not component state: a reload used to
   * cancel the snooze and set the alarm off again on the spot.
   */
  snoozedUntil?: number
}

export interface StopwatchState {
  accumulatedMs: number
  /** Absent while paused. */
  runningSince?: number
  /** Elapsed-at-lap snapshots, oldest first. */
  laps: number[]
}

export interface IntervalState {
  config: IntervalConfig
  /** Absent while idle or paused. */
  startedAt?: number
  /** Elapsed frozen at pause time. */
  pausedElapsedMs?: number
}

export interface MetronomeState {
  bpm: number
  beatsPerBar: number
  /** Absent while stopped. A reload resumes from now — never catches up. */
  runningSince?: number
}

export interface SettingsState {
  theme: Theme
  sound: boolean
  /** 0 to 1. */
  volume: number
  notifications: boolean
}

export interface MeetingState {
  participants: MeetingParticipant[]
  /** Meeting length; a slot must fit it end to end to count as workable. */
  durationMin: number
  /** "YYYY-MM-DD" in the first participant's zone. Absent means today. */
  day?: string
}

export interface AppState {
  version: 1
  settings: SettingsState
  countdown: { timers: CountdownItem[]; presets: Preset[] }
  stopwatch: StopwatchState
  interval: IntervalState
  metronome: MetronomeState
  world: { zoneIds: string[] }
  meeting: MeetingState
  alarms: { alarms: AlarmItem[] }
}

export const DEFAULT_INTERVAL: IntervalConfig = {
  prepareMs: 10_000,
  workMs: 30_000,
  restMs: 30_000,
  rounds: 8,
  cooldownMs: 0,
}

export const DEFAULT_PRESETS: readonly { label: string; durationMs: number }[] = [
  { label: 'Egg · soft', durationMs: 6 * 60_000 + 30_000 },
  { label: 'Egg · hard', durationMs: 9 * 60_000 + 30_000 },
  { label: 'Tea · green', durationMs: 3 * 60_000 },
  { label: 'Tea · black', durationMs: 5 * 60_000 },
  { label: 'Pasta', durationMs: 11 * 60_000 },
  { label: 'Laundry', durationMs: 45 * 60_000 },
  { label: 'Meeting', durationMs: 25 * 60_000 },
  { label: 'Workout', durationMs: 45 * 60_000 },
]
