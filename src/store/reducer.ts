/**
 * The whole app state, one reducer.
 *
 * Every time-based field here is a timestamp or a frozen remainder — never a
 * running count — so persisted state stays truthful across reloads and
 * background tabs. The reducer is pure: `now` arrives inside the action.
 */
import { pause, resume, start } from '../engine/countdown.ts'
import {
  DEFAULT_END_MIN,
  DEFAULT_START_MIN,
  MAX_PARTICIPANTS,
  type MeetingParticipant,
} from '../engine/meeting.ts'
import { reanchor } from '../engine/metronome.ts'
import { makeId } from '../lib/id.ts'
import type { Action } from './actions.ts'
import type { AppState, CountdownItem, RecentDuration } from './types.ts'
import { DEFAULT_PRESETS } from './types.ts'

export function defaultState(localZone: string): AppState {
  return {
    version: 1,
    settings: { theme: 'system', sound: true, volume: 0.7, notifications: false },
    countdown: {
      timers: [],
      presets: DEFAULT_PRESETS.map((preset, index) => ({ id: `preset-${index}`, ...preset })),
      recents: [],
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
    meeting: {
      // A literal id, not `makeId()`: two calls to `defaultState` must be
      // comparable, which is exactly what the persistence tests do.
      participants: [
        {
          id: 'me',
          label: '',
          zoneId: localZone,
          startMin: DEFAULT_START_MIN,
          endMin: DEFAULT_END_MIN,
        },
      ],
      durationMin: 30,
    },
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

/** A finite number pulled into range; anything else keeps the old value. */
const clamped = (value: number | undefined, min: number, max: number, fallback: number): number =>
  value === undefined || !Number.isFinite(value) ? fallback : Math.min(max, Math.max(min, value))

/** Newest first, no repeats, six deep — enough to be useful, short enough to scan. */
const RECENTS = 6

/**
 * Remember a duration, and what it was called.
 *
 * Keyed by the duration, so eleven minutes is one chip however many times you
 * run it. A start with no label keeps the name the chip already had — running
 * an unnamed eleven minutes should not wipe out "Pasta", and re-running it
 * with a new name is the only thing that renames it.
 */
const rememberDuration = (
  recents: readonly RecentDuration[],
  label: string,
  durationMs: number,
): RecentDuration[] => {
  const named = label.trim()
  const previous = recents.find((recent) => recent.durationMs === durationMs)
  return [
    { label: named === '' ? (previous?.label ?? '') : named, durationMs },
    ...recents.filter((recent) => recent.durationMs !== durationMs),
  ].slice(0, RECENTS)
}

const mapMeeting = (
  state: AppState,
  fn: (meeting: AppState['meeting']) => AppState['meeting'],
) => ({
  ...state,
  meeting: fn(state.meeting),
})

const mapParticipant = (
  state: AppState,
  id: string,
  fn: (participant: MeetingParticipant) => MeetingParticipant,
): AppState =>
  mapMeeting(state, (meeting) => ({
    ...meeting,
    participants: meeting.participants.map((participant) =>
      participant.id === id ? fn(participant) : participant,
    ),
  }))

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
        // The fallback lives here, where it is only ever a display name.
        label: action.label.trim() === '' ? 'Timer' : action.label.trim(),
        ...start({ totalMs: action.durationMs }, action.now),
      }
      return {
        ...state,
        countdown: {
          ...state.countdown,
          timers: [...state.countdown.timers, timer],
          recents: rememberDuration(state.countdown.recents, action.label, action.durationMs),
        },
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
    // `endAt` and `pausedRemainingMs` are mutually exclusive by the engine's own
    // contract, and each transition returns only the one it sets. Spreading
    // that over the old timer left the other behind — and since `remainingMs`
    // reads `pausedRemainingMs` first, a resumed countdown stayed frozen on the
    // value it was paused at, for good. Clearing both first is what makes the
    // invariant hold no matter which field a transition happens to return.
    case 'countdown/start':
      return mapTimer(state, action.id, (timer) => ({
        ...omit(timer, 'firedAt', 'silencedAt', 'endAt', 'pausedRemainingMs'),
        ...start(timer, action.now),
      }))
    case 'countdown/pause':
      return mapTimer(state, action.id, (timer) => ({
        ...omit(timer, 'endAt', 'pausedRemainingMs'),
        ...pause(timer, action.now),
      }))
    case 'countdown/resume':
      return mapTimer(state, action.id, (timer) => ({
        ...omit(timer, 'endAt', 'pausedRemainingMs'),
        ...resume(timer, action.now),
      }))
    case 'countdown/restart':
      return mapTimer(state, action.id, (timer) => ({
        ...omit(timer, 'firedAt', 'silencedAt', 'endAt', 'pausedRemainingMs'),
        ...start(timer, action.now),
      }))
    case 'countdown/fired':
      return mapTimer(state, action.id, (timer) =>
        timer.firedAt === undefined ? { ...timer, firedAt: action.now } : timer,
      )
    // Stopping the ringing, not the timer: the card stays on the board,
    // finished, with its Restart still there.
    case 'countdown/silence':
      return mapTimer(state, action.id, (timer) =>
        timer.silencedAt === undefined ? { ...timer, silencedAt: action.now } : timer,
      )

    case 'countdown/recent/remove':
      return {
        ...state,
        countdown: {
          ...state.countdown,
          recents: state.countdown.recents.filter(
            (recent) => recent.durationMs !== action.durationMs,
          ),
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

    case 'metronome/set': {
      // Spread, not rebuild: a tempo edit must not stop a running pulse.
      const bpm = clamped(action.bpm, 20, 300, state.metronome.bpm)
      const beatsPerBar = clamped(action.beatsPerBar, 1, 12, state.metronome.beatsPerBar)
      const { runningSince } = state.metronome
      // And it must not restart the bar either: the origin moves so that the
      // beat index and its fraction are the same on both sides of the change.
      // Without this, every step of a tempo slider drops you back on beat one.
      const anchored =
        runningSince !== undefined && bpm !== state.metronome.bpm
          ? reanchor(runningSince, state.metronome.bpm, bpm, action.now)
          : runningSince
      return {
        ...state,
        metronome: {
          ...state.metronome,
          bpm,
          beatsPerBar,
          ...(anchored === undefined ? {} : { runningSince: anchored }),
        },
      }
    }
    case 'metronome/start':
      if (state.metronome.runningSince !== undefined) return state
      return { ...state, metronome: { ...state.metronome, runningSince: action.now } }
    case 'metronome/stop':
      return { ...state, metronome: omit(state.metronome, 'runningSince') }

    case 'meeting/participant/add': {
      // Duplicate zones are allowed, unlike the world clock: two people in one
      // city with different hours is an ordinary case, not a mistake.
      if (state.meeting.participants.length >= MAX_PARTICIPANTS) return state
      return mapMeeting(state, (meeting) => ({
        ...meeting,
        participants: [
          ...meeting.participants,
          {
            id: makeId(),
            label: '',
            zoneId: action.zoneId,
            startMin: DEFAULT_START_MIN,
            endMin: DEFAULT_END_MIN,
          },
        ],
      }))
    }
    case 'meeting/participant/remove':
      // The first participant anchors the grid, so the roster never empties.
      if (state.meeting.participants.length <= 1) return state
      return mapMeeting(state, (meeting) => ({
        ...meeting,
        participants: meeting.participants.filter((participant) => participant.id !== action.id),
      }))
    case 'meeting/participant/label':
      return mapParticipant(state, action.id, (participant) => ({
        ...participant,
        label: action.label.slice(0, 60),
      }))
    case 'meeting/participant/zone':
      return mapParticipant(state, action.id, (participant) => ({
        ...participant,
        zoneId: action.zoneId,
      }))
    case 'meeting/participant/hours': {
      const startMin = clamped(action.startMin, 0, 1440, DEFAULT_START_MIN)
      const endMin = clamped(action.endMin, 0, 1440, DEFAULT_END_MIN)
      // No overnight windows: a working day that wraps midnight is a different
      // feature, and a silently inverted one would read as availability.
      if (startMin >= endMin) return state
      return mapParticipant(state, action.id, (participant) => ({
        ...participant,
        startMin,
        endMin,
      }))
    }
    case 'meeting/participant/move': {
      const from = state.meeting.participants.findIndex(
        (participant) => participant.id === action.id,
      )
      const to = from + action.delta
      if (from < 0 || to < 0 || to >= state.meeting.participants.length) return state
      const participants = [...state.meeting.participants]
      const [moved] = participants.splice(from, 1)
      participants.splice(to, 0, moved!)
      return mapMeeting(state, (meeting) => ({ ...meeting, participants }))
    }
    case 'meeting/duration':
      return mapMeeting(state, (meeting) => ({
        ...meeting,
        durationMin: clamped(action.durationMin, 5, 480, meeting.durationMin),
      }))
    case 'meeting/day':
      return mapMeeting(state, (meeting) =>
        action.day === undefined ? omit(meeting, 'day') : { ...meeting, day: action.day },
      )
    case 'meeting/replace':
      // Everything here has already been vetted by `decodeMeeting`; fresh ids
      // keep a shared roster from colliding with the local one.
      return mapMeeting(state, (meeting) => ({
        ...omit(meeting, 'day'),
        participants: action.participants.map((participant) => ({
          ...participant,
          id: makeId(),
        })),
        durationMin: action.durationMin,
      }))

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
              ? // Dismissing ends any snooze with it.
                { ...omit(alarm, 'snoozedUntil'), lastRangAt: action.at }
              : alarm,
          ),
        },
      }
    case 'alarm/snooze':
      return {
        ...state,
        alarms: {
          alarms: state.alarms.alarms.map((alarm) =>
            alarm.id === action.id ? { ...alarm, snoozedUntil: action.until } : alarm,
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
