import { describe, expect, it } from 'vitest'
import { defaultState, reducer } from './reducer.ts'
import type { AppState } from './types.ts'

const NOW = 1_000_000
const MIN = 60_000

const state = (overrides?: Partial<AppState>): AppState => ({
  ...defaultState('UTC'),
  ...overrides,
})

describe('countdown', () => {
  it('adds a timer, already running', () => {
    const next = reducer(state(), {
      type: 'countdown/add',
      label: 'Egg',
      durationMs: 6 * MIN + 30_000,
      now: NOW,
    })
    const timer = next.countdown.timers[0]
    expect(timer).toMatchObject({ label: 'Egg', totalMs: 390_000, endAt: NOW + 390_000 })
    expect(timer!.id).toBeTruthy()
  })

  it('starts, pauses and resumes a timer through the engine', () => {
    const added = reducer(state(), {
      type: 'countdown/add',
      label: 'Tea',
      durationMs: 5 * MIN,
      now: NOW,
    })
    const id = added.countdown.timers[0]!.id

    const paused = reducer(added, { type: 'countdown/pause', id, now: NOW + MIN })
    expect(paused.countdown.timers[0]).toMatchObject({ pausedRemainingMs: 4 * MIN })

    const resumed = reducer(paused, { type: 'countdown/resume', id, now: NOW + 10 * MIN })
    expect(resumed.countdown.timers[0]).toMatchObject({ endAt: NOW + 14 * MIN })
  })

  it('marks a fired timer exactly once', () => {
    const added = reducer(state(), { type: 'countdown/add', label: 'X', durationMs: MIN, now: NOW })
    const id = added.countdown.timers[0]!.id

    const fired = reducer(added, { type: 'countdown/fired', id, now: NOW + MIN })
    const firedAgain = reducer(fired, { type: 'countdown/fired', id, now: NOW + MIN + 1 })
    expect(fired.countdown.timers[0]!.firedAt).toBe(NOW + MIN)
    expect(firedAgain.countdown.timers[0]!.firedAt).toBe(NOW + MIN)
  })

  it('restarts from the original duration', () => {
    const added = reducer(state(), {
      type: 'countdown/add',
      label: 'X',
      durationMs: 2 * MIN,
      now: NOW,
    })
    const id = added.countdown.timers[0]!.id
    const restarted = reducer(added, { type: 'countdown/restart', id, now: NOW + 90_000 })
    expect(restarted.countdown.timers[0]).toMatchObject({ endAt: NOW + 90_000 + 2 * MIN })
    expect(restarted.countdown.timers[0]!.firedAt).toBeUndefined()
  })

  it('removes a timer', () => {
    const added = reducer(state(), { type: 'countdown/add', label: 'X', durationMs: MIN, now: NOW })
    const id = added.countdown.timers[0]!.id
    expect(reducer(added, { type: 'countdown/remove', id }).countdown.timers).toHaveLength(0)
  })

  it('manages presets: default presets ship, custom ones add and remove', () => {
    const initial = state()
    expect(initial.countdown.presets.length).toBeGreaterThan(3)

    const withCustom = reducer(initial, {
      type: 'countdown/preset/add',
      label: 'Sourdough',
      durationMs: 45 * MIN,
    })
    const custom = withCustom.countdown.presets.find((preset) => preset.label === 'Sourdough')
    expect(custom).toBeTruthy()

    const withoutCustom = reducer(withCustom, { type: 'countdown/preset/remove', id: custom!.id })
    expect(withoutCustom.countdown.presets.find((p) => p.label === 'Sourdough')).toBeUndefined()
  })

  it('refuses to add a zero-duration timer', () => {
    const next = reducer(state(), {
      type: 'countdown/add',
      label: 'Ghost',
      durationMs: 0,
      now: NOW,
    })
    expect(next.countdown.timers).toHaveLength(0)
  })
})

describe('stopwatch', () => {
  it('starts, pauses, laps and resets', () => {
    const started = reducer(state(), { type: 'stopwatch/start', now: NOW })
    expect(started.stopwatch).toMatchObject({ accumulatedMs: 0, runningSince: NOW })

    const lapped = reducer(started, { type: 'stopwatch/lap', now: NOW + 30_000 })
    expect(lapped.stopwatch.laps).toEqual([30_000])

    const paused = reducer(lapped, { type: 'stopwatch/pause', now: NOW + MIN })
    expect(paused.stopwatch).toMatchObject({ accumulatedMs: MIN, laps: [30_000] })

    const resumed = reducer(paused, { type: 'stopwatch/start', now: NOW + 10 * MIN })
    expect(resumed.stopwatch).toMatchObject({ accumulatedMs: MIN, runningSince: NOW + 10 * MIN })

    const reset = reducer(resumed, { type: 'stopwatch/reset' })
    expect(reset.stopwatch).toEqual({ accumulatedMs: 0, laps: [] })
  })

  it('starting an already-running stopwatch changes nothing', () => {
    const started = reducer(state(), { type: 'stopwatch/start', now: NOW })
    expect(reducer(started, { type: 'stopwatch/start', now: NOW + 5_000 })).toBe(started)
  })
})

describe('interval', () => {
  it('starts from a config, pauses and resumes with elapsed preserved', () => {
    const started = reducer(state(), { type: 'interval/start', now: NOW })
    expect(started.interval.startedAt).toBe(NOW)

    const paused = reducer(started, { type: 'interval/pause', now: NOW + 40_000 })
    // startedAt is absent (omitted, not undefined) while paused.
    expect(paused.interval).toMatchObject({ pausedElapsedMs: 40_000 })
    expect(paused.interval.startedAt).toBeUndefined()

    const resumed = reducer(paused, { type: 'interval/resume', now: NOW + 10 * MIN })
    expect(resumed.interval).toMatchObject({ startedAt: NOW + 10 * MIN - 40_000 })
  })

  it('clears the run on reset', () => {
    const started = reducer(state(), { type: 'interval/start', now: NOW })
    const reset = reducer(started, { type: 'interval/reset' })
    expect(reset.interval.startedAt).toBeUndefined()
    expect(reset.interval.pausedElapsedMs).toBeUndefined()
  })
})

describe('metronome, world clock, alarms, settings', () => {
  it('sets metronome tempo and bar length', () => {
    const next = reducer(state(), { type: 'metronome/set', bpm: 144, beatsPerBar: 3 })
    expect(next.metronome).toEqual({ bpm: 144, beatsPerBar: 3 })
  })

  it('adds and removes world zones without duplicates', () => {
    const withParis = reducer(state(), { type: 'world/add', zoneId: 'Europe/Paris' })
    const doubled = reducer(withParis, { type: 'world/add', zoneId: 'Europe/Paris' })
    expect(doubled.world.zoneIds.filter((z) => z === 'Europe/Paris')).toHaveLength(1)

    const without = reducer(withParis, { type: 'world/remove', zoneId: 'Europe/Paris' })
    expect(without.world.zoneIds).not.toContain('Europe/Paris')
  })

  it('moves world zones up and down', () => {
    let next = state({ world: { zoneIds: ['UTC', 'Europe/Paris', 'Asia/Tokyo'] } })
    next = reducer(next, { type: 'world/move', zoneId: 'Asia/Tokyo', delta: -1 })
    expect(next.world.zoneIds).toEqual(['UTC', 'Asia/Tokyo', 'Europe/Paris'])
    next = reducer(next, { type: 'world/move', zoneId: 'Asia/Tokyo', delta: 1 })
    expect(next.world.zoneIds).toEqual(['UTC', 'Europe/Paris', 'Asia/Tokyo'])
    // Edges do not wrap.
    expect(reducer(next, { type: 'world/move', zoneId: 'UTC', delta: -1 }).world.zoneIds).toEqual([
      'UTC',
      'Europe/Paris',
      'Asia/Tokyo',
    ])
  })

  it('manages alarms: add, set, toggle, remove', () => {
    const added = reducer(state(), { type: 'alarm/add', time: '07:30' })
    const id = added.alarms.alarms[0]!.id
    expect(added.alarms.alarms[0]).toMatchObject({ time: '07:30', enabled: true, days: [] })

    const withDays = reducer(added, { type: 'alarm/setDays', id, days: [1, 3, 5] })
    expect(withDays.alarms.alarms[0]!.days).toEqual([1, 3, 5])

    const toggled = reducer(withDays, { type: 'alarm/toggle', id })
    expect(toggled.alarms.alarms[0]!.enabled).toBe(false)

    const removed = reducer(toggled, { type: 'alarm/remove', id })
    expect(removed.alarms.alarms).toHaveLength(0)
  })

  it('patches settings without touching the rest', () => {
    const next = reducer(state(), { type: 'settings/set', patch: { volume: 0.4, theme: 'dark' } })
    expect(next.settings).toMatchObject({ volume: 0.4, theme: 'dark' })
    expect(next.countdown.timers).toHaveLength(0)
  })
})

describe('reducer hygiene', () => {
  it('returns the same reference for an unknown action', () => {
    const initial = state()
    expect(reducer(initial, { type: 'nonsense' } as unknown as Parameters<typeof reducer>[1])).toBe(
      initial,
    )
  })

  it('never mutates the previous state', () => {
    const initial = state()
    reducer(initial, { type: 'countdown/add', label: 'X', durationMs: MIN, now: NOW })
    expect(initial.countdown.timers).toHaveLength(0)
  })
})
