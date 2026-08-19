import type { IntervalConfig } from '../engine/intervals.ts'
import type { SettingsState, Theme } from './types.ts'

/**
 * Every action that can change app state. Time-dependent actions carry their
 * own `now` — the reducer stays pure and the tests need no clock.
 */
export type Action =
  | { type: 'countdown/add'; label: string; durationMs: number; now: number }
  | { type: 'countdown/remove'; id: string }
  | { type: 'countdown/start'; id: string; now: number }
  | { type: 'countdown/pause'; id: string; now: number }
  | { type: 'countdown/resume'; id: string; now: number }
  | { type: 'countdown/restart'; id: string; now: number }
  | { type: 'countdown/fired'; id: string; now: number }
  | { type: 'countdown/preset/add'; label: string; durationMs: number }
  | { type: 'countdown/preset/remove'; id: string }
  | { type: 'stopwatch/start'; now: number }
  | { type: 'stopwatch/pause'; now: number }
  | { type: 'stopwatch/lap'; now: number }
  | { type: 'stopwatch/reset' }
  | { type: 'interval/config'; config: IntervalConfig }
  | { type: 'interval/start'; now: number }
  | { type: 'interval/pause'; now: number }
  | { type: 'interval/resume'; now: number }
  | { type: 'interval/reset' }
  | { type: 'metronome/set'; bpm?: number; beatsPerBar?: number }
  | { type: 'world/add'; zoneId: string }
  | { type: 'world/remove'; zoneId: string }
  | { type: 'world/move'; zoneId: string; delta: number }
  | { type: 'alarm/add'; time: string }
  | { type: 'alarm/remove'; id: string }
  | { type: 'alarm/toggle'; id: string }
  | { type: 'alarm/setTime'; id: string; time: string }
  | { type: 'alarm/setDays'; id: string; days: number[] }
  | {
      type: 'settings/set'
      patch: Partial<Pick<SettingsState, 'sound' | 'volume' | 'notifications'>> | { theme: Theme }
    }
