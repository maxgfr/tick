import { describe, expect, it } from 'vitest'
import { beatPositionAt } from '../engine/metronome.ts'
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
    const next = reducer(state(), { type: 'metronome/set', bpm: 144, beatsPerBar: 3, now: NOW })
    expect(next.metronome).toEqual({ bpm: 144, beatsPerBar: 3 })
  })

  it('keeps a run in the store: start, no double-start, stop clears the key', () => {
    const started = reducer(state(), { type: 'metronome/start', now: NOW })
    expect(started.metronome.runningSince).toBe(NOW)

    // A second start while running changes nothing — not even the reference.
    const again = reducer(started, { type: 'metronome/start', now: NOW + 5_000 })
    expect(again).toBe(started)

    const stopped = reducer(started, { type: 'metronome/stop' })
    expect('runningSince' in stopped.metronome).toBe(false)
    expect(stopped.metronome.bpm).toBe(started.metronome.bpm)
  })

  it('a tempo edit survives a running metronome, and a stop never adds the key', () => {
    const started = reducer(state(), { type: 'metronome/start', now: NOW })
    const retuned = reducer(started, { type: 'metronome/set', bpm: 208, now: NOW })
    // Edited on the downbeat itself, so the re-anchored origin is still NOW.
    expect(retuned.metronome).toEqual({ bpm: 208, beatsPerBar: 4, runningSince: NOW })

    const stopped = reducer(retuned, { type: 'metronome/stop' })
    const edited = reducer(stopped, { type: 'metronome/set', bpm: 96, now: NOW })
    expect('runningSince' in edited.metronome).toBe(false)
  })

  it('re-phases a running bar on a tempo change instead of restarting it', () => {
    // Two and a half beats into a 120 BPM run (500 ms a beat) when the tempo
    // halves. The bar must not jump back to one.
    const started = reducer(
      { ...state(), metronome: { bpm: 120, beatsPerBar: 4 } },
      { type: 'metronome/start', now: NOW },
    )
    const at = NOW + 1_250
    const retuned = reducer(started, { type: 'metronome/set', bpm: 60, now: at })

    // Still 2.5 beats in, now measured in 1000 ms beats: the origin moved back.
    expect(beatPositionAt(retuned.metronome.runningSince!, 60, at)).toBeCloseTo(2.5, 9)
  })

  it('refuses a tempo outside the dial, and never lets a zero bar through', () => {
    const wild = reducer(state(), { type: 'metronome/set', bpm: 9_000, now: NOW })
    expect(wild.metronome.bpm).toBe(300)

    const slow = reducer(state(), { type: 'metronome/set', bpm: 1, now: NOW })
    expect(slow.metronome.bpm).toBe(20)

    // A NaN out of a cleared number field keeps the old value rather than
    // poisoning every later modulo.
    const nan = reducer(state(), { type: 'metronome/set', beatsPerBar: Number.NaN, now: NOW })
    expect(nan.metronome.beatsPerBar).toBe(4)

    const zero = reducer(state(), { type: 'metronome/set', beatsPerBar: 0, now: NOW })
    expect(zero.metronome.beatsPerBar).toBe(1)
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

describe('alarm ringing bookkeeping', () => {
  it('records when an alarm last rang, never moving backwards', () => {
    const added = reducer(state(), { type: 'alarm/add', time: '07:30' })
    const id = added.alarms.alarms[0]!.id

    const rang = reducer(added, { type: 'alarm/fired', id, at: 1_000 })
    expect(rang.alarms.alarms[0]!.lastRangAt).toBe(1_000)

    const older = reducer(rang, { type: 'alarm/fired', id, at: 500 })
    expect(older.alarms.alarms[0]!.lastRangAt).toBe(1_000)
  })
})

describe('whole-state replace and clear', () => {
  it('replaces the state wholesale — the import path', () => {
    const imported = state({
      countdown: { timers: [], presets: [{ id: 'p1', label: 'Steep', durationMs: 2 * MIN }] },
      world: { zoneIds: ['Asia/Tokyo'] },
    })
    const next = reducer(state(), { type: 'state/replace', state: imported })
    expect(next).toBe(imported)
  })

  it('clears back to defaults, presets restored', () => {
    const dirty = reducer(state(), {
      type: 'countdown/add',
      label: 'Tea',
      durationMs: MIN,
      now: NOW,
    })
    expect(dirty.countdown.timers).toHaveLength(1)

    const cleared = reducer(dirty, { type: 'state/clear', localZone: 'Europe/Paris' })
    expect(cleared).toEqual(defaultState('Europe/Paris'))
  })
})
