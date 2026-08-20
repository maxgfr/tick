/**
 * The whole app state, one reducer.
 *
 * Every time-based field here is a timestamp or a frozen remainder — never a
 * running count — so persisted state stays truthful across reloads and
 * background tabs. The reducer is pure: `now` arrives inside the action.
 */
import { pause, resume, start } from '../engine/countdown.ts'
import { makeId } from '../lib/id.ts'
import type { Action } from './actions.ts'
import type { AppState, CountdownItem } from './types.ts'
import { DEFAULT_PRESETS } from './types.ts'

export function defaultState(localZone: string): AppState {
  return {
    version: 1,
    settings: { theme: 'system', sound: true, volume: 0.7, notifications: false },
    countdown: {
      timers: [],
      presets: DEFAULT_PRESETS.map((preset, index) => ({ id: `preset-${index}`, ...preset })),
    },
    stopwatch: { accumulatedMs: 0, laps: [] },
    interval: {
      config: {
        prepareMs: 10_000,
        workMs: 30_000,
        restMs: 30_000,
        rounds: 8,
        cooldownMs: 0,
      },
    },
    metronome: { bpm: 100, beatsPerBar: 4 },
    world: { zoneIds: dedupe([localZone, 'UTC']) },
    alarms: { alarms: [] },
  }
}

const dedupe = (zones: string[]): string[] => [...new Set(zones)]

/** A copy without the keys — `undefined` values and exactOptionalPropertyTypes do not mix. */
const omit = <T extends object, K extends keyof T>(object: T, ...keys: K[]): Omit<T, K> => {
  const copy = { ...object }
  for (const key of keys) delete copy[key]
  return copy
}

const mapTimer = (
  state: AppState,
  id: string,
  fn: (timer: CountdownItem) => CountdownItem,
): AppState => ({
  ...state,
  countdown: {
    ...state.countdown,
    timers: state.countdown.timers.map((timer) => (timer.id === id ? fn(timer) : timer)),
  },
})

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'countdown/add': {
      if (action.durationMs <= 0) return state
      const timer: CountdownItem = {
        id: makeId(),
        label: action.label,
        ...start({ totalMs: action.durationMs }, action.now),
      }
      return {
        ...state,
        countdown: { ...state.countdown, timers: [...state.countdown.timers, timer] },
      }
    }
    case 'countdown/remove':
      return {
        ...state,
        countdown: {
          ...state.countdown,
          timers: state.countdown.timers.filter((timer) => timer.id !== action.id),
        },
      }
    case 'countdown/start':
      return mapTimer(state, action.id, (timer) => ({
        ...omit(timer, 'firedAt'),
        ...start(timer, action.now),
      }))
    case 'countdown/pause':
      return mapTimer(state, action.id, (timer) => ({ ...timer, ...pause(timer, action.now) }))
    case 'countdown/resume':
      return mapTimer(state, action.id, (timer) => ({ ...timer, ...resume(timer, action.now) }))
    case 'countdown/restart':
      return mapTimer(state, action.id, (timer) => ({
        ...omit(timer, 'firedAt'),
        ...start(timer, action.now),
      }))
    case 'countdown/fired':
      return mapTimer(state, action.id, (timer) =>
        timer.firedAt === undefined ? { ...timer, firedAt: action.now } : timer,
      )

    case 'countdown/preset/add':
      return {
        ...state,
        countdown: {
          ...state.countdown,
          presets: [
            ...state.countdown.presets,
            { id: makeId(), label: action.label, durationMs: action.durationMs },
          ],
        },
      }
    case 'countdown/preset/remove':
      return {
        ...state,
        countdown: {
          ...state.countdown,
          presets: state.countdown.presets.filter((preset) => preset.id !== action.id),
        },
      }

    case 'stopwatch/start': {
      if (state.stopwatch.runningSince !== undefined) return state
      return { ...state, stopwatch: { ...state.stopwatch, runningSince: action.now } }
    }
    case 'stopwatch/pause': {
      const { runningSince, accumulatedMs, laps } = state.stopwatch
      if (runningSince === undefined) return state
      return {
        ...state,
        stopwatch: { accumulatedMs: accumulatedMs + (action.now - runningSince), laps },
      }
    }
    case 'stopwatch/lap': {
      const { runningSince, accumulatedMs, laps } = state.stopwatch
      if (runningSince === undefined) return state
      return {
        ...state,
        stopwatch: {
          ...state.stopwatch,
          laps: [...laps, accumulatedMs + (action.now - runningSince)],
        },
      }
    }
    case 'stopwatch/reset':
      return { ...state, stopwatch: { accumulatedMs: 0, laps: [] } }

    case 'interval/config':
      return { ...state, interval: { ...state.interval, config: action.config } }
    case 'interval/start':
      return {
        ...state,
        interval: { config: state.interval.config, startedAt: action.now },
      }
    case 'interval/pause': {
      const { startedAt, pausedElapsedMs, config } = state.interval
      if (startedAt === undefined) return state
      return {
        ...state,
        interval: {
          config,
          pausedElapsedMs: (pausedElapsedMs ?? 0) + (action.now - startedAt),
        },
      }
    }
    case 'interval/resume': {
      const { pausedElapsedMs, config } = state.interval
      return {
        ...state,
        interval: { config, startedAt: action.now - (pausedElapsedMs ?? 0) },
      }
    }
    case 'interval/reset':
      return { ...state, interval: { config: state.interval.config } }

    case 'metronome/set':
      // Spread, not rebuild: a tempo edit must not stop a running pulse.
      return {
        ...state,
        metronome: {
          ...state.metronome,
          bpm: action.bpm ?? state.metronome.bpm,
          beatsPerBar: action.beatsPerBar ?? state.metronome.beatsPerBar,
        },
      }
    case 'metronome/start':
      if (state.metronome.runningSince !== undefined) return state
      return { ...state, metronome: { ...state.metronome, runningSince: action.now } }
    case 'metronome/stop':
      return { ...state, metronome: omit(state.metronome, 'runningSince') }

    case 'world/add':
      return state.world.zoneIds.includes(action.zoneId)
        ? state
        : { ...state, world: { zoneIds: [...state.world.zoneIds, action.zoneId] } }
    case 'world/remove':
      return {
        ...state,
        world: { zoneIds: state.world.zoneIds.filter((z) => z !== action.zoneId) },
      }
    case 'world/move': {
      const index = state.world.zoneIds.indexOf(action.zoneId)
      const target = index + action.delta
      if (index === -1 || target < 0 || target >= state.world.zoneIds.length) return state
      const zones = [...state.world.zoneIds]
      const [moved] = zones.splice(index, 1)
      if (moved === undefined) return state
      zones.splice(target, 0, moved)
      return { ...state, world: { zoneIds: zones } }
    }

    case 'alarm/add':
      return {
        ...state,
        alarms: {
          alarms: [
            ...state.alarms.alarms,
            { id: makeId(), time: action.time, days: [], enabled: true },
          ],
        },
      }
    case 'alarm/remove':
      return {
        ...state,
        alarms: { alarms: state.alarms.alarms.filter((alarm) => alarm.id !== action.id) },
      }
    case 'alarm/toggle':
      return {
        ...state,
        alarms: {
          alarms: state.alarms.alarms.map((alarm) =>
            alarm.id === action.id ? { ...alarm, enabled: !alarm.enabled } : alarm,
          ),
        },
      }
    case 'alarm/fired':
      return {
        ...state,
        alarms: {
          alarms: state.alarms.alarms.map((alarm) =>
            alarm.id === action.id && action.at > (alarm.lastRangAt ?? 0)
              ? { ...alarm, lastRangAt: action.at }
              : alarm,
          ),
        },
      }
    case 'alarm/setTime':
      return {
        ...state,
        alarms: {
          alarms: state.alarms.alarms.map((alarm) =>
            alarm.id === action.id ? { ...alarm, time: action.time } : alarm,
          ),
        },
      }
    case 'alarm/setDays':
      return {
        ...state,
        alarms: {
          alarms: state.alarms.alarms.map((alarm) =>
            alarm.id === action.id ? { ...alarm, days: action.days } : alarm,
          ),
        },
      }

    case 'settings/set':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    // The settings view's whole-state levers: import (already sanitized
    // through loadState before it gets here) and the reset button.
    case 'state/replace':
      return action.state
    case 'state/clear':
      return defaultState(action.localZone)

    default:
      return state
  }
}
