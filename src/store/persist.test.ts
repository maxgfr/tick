import { describe, expect, it } from 'vitest'
import { defaultState } from './reducer.ts'
import { loadState, STORAGE_KEY, serialize } from './persist.ts'

describe('serialize / loadState round-trip', () => {
  it('round-trips a full state', () => {
    const state = defaultState('UTC')
    expect(loadState(serialize(state), 'UTC')).toEqual(state)
  })

  it('round-trips a state mid-run — a countdown survives the reload', () => {
    const state = {
      ...defaultState('UTC'),
      countdown: {
        timers: [{ id: 't1', label: 'Tea', totalMs: 300_000, endAt: 123_456_789 }],
        presets: [],
      },
    }
    const loaded = loadState(serialize(state), 'UTC')
    expect(loaded.countdown.timers[0]).toMatchObject({ endAt: 123_456_789, label: 'Tea' })
  })

  it('round-trips a metronome run — the pulse survives the reload', () => {
    const state = {
      ...defaultState('UTC'),
      metronome: { bpm: 120, beatsPerBar: 4, runningSince: 123_456_789 },
    }
    const loaded = loadState(serialize(state), 'UTC')
    expect(loaded.metronome).toEqual({ bpm: 120, beatsPerBar: 4, runningSince: 123_456_789 })
  })
})

describe('loadState resilience', () => {
  it('returns the default state for missing storage', () => {
    expect(loadState(null, 'UTC')).toEqual(defaultState('UTC'))
    expect(loadState('', 'UTC')).toEqual(defaultState('UTC'))
  })

  it('returns the default state for corrupted storage', () => {
    expect(loadState('{not json', 'UTC')).toEqual(defaultState('UTC'))
    expect(loadState('"just a string"', 'UTC')).toEqual(defaultState('UTC'))
  })

  it('fills in slices an older version did not have', () => {
    const older = serialize(defaultState('UTC'))
    const olderJson = JSON.parse(older) as Record<string, unknown>
    delete olderJson.metronome
    delete olderJson.alarms

    const loaded = loadState(JSON.stringify(olderJson), 'UTC')
    expect(loaded.metronome).toEqual(defaultState('UTC').metronome)
    expect(loaded.alarms).toEqual(defaultState('UTC').alarms)
  })

  it('drops unknown fields rather than crashing', () => {
    const noisy = { ...JSON.parse(serialize(defaultState('UTC'))), fromTheFuture: true }
    const loaded = loadState(JSON.stringify(noisy), 'UTC')
    expect(loaded.version).toBe(1)
    expect(loaded).not.toHaveProperty('fromTheFuture')
  })
})

describe('STORAGE_KEY', () => {
  it('is namespaced to the app', () => {
    expect(STORAGE_KEY).toMatch(/^tick:/)
  })
})

describe('loadState, against a malformed backup', () => {
  it('rejects a slice that lost its shape instead of adopting it', () => {
    // The import dialog hands any JSON file to this function. `{}` used to
    // pass the `typeof === 'object'` check, and `timers.some(...)` then threw
    // on every render — with the bad state already persisted.
    const loaded = loadState(JSON.stringify({ countdown: {} }), 'UTC')
    expect(Array.isArray(loaded.countdown.timers)).toBe(true)
    expect(Array.isArray(loaded.countdown.presets)).toBe(true)
  })

  it('rejects an array where an object belongs', () => {
    const loaded = loadState(JSON.stringify({ world: [], alarms: [] }), 'UTC')
    expect(Array.isArray(loaded.world.zoneIds)).toBe(true)
    expect(Array.isArray(loaded.alarms.alarms)).toBe(true)
  })

  it('rejects each malformed slice on its own, keeping the good ones', () => {
    const loaded = loadState(
      JSON.stringify({
        stopwatch: {},
        metronome: { bpm: 144, beatsPerBar: 3 },
        world: { zoneIds: ['Europe/Paris'] },
      }),
      'UTC',
    )
    expect(loaded.stopwatch.accumulatedMs).toBe(0)
    expect(loaded.stopwatch.laps).toEqual([])
    // The well-formed neighbours are untouched.
    expect(loaded.metronome.bpm).toBe(144)
    expect(loaded.world.zoneIds).toEqual(['Europe/Paris'])
  })

  it('fills settings keys an older build never wrote', () => {
    const loaded = loadState(JSON.stringify({ settings: { theme: 'dark' } }), 'UTC')
    expect(loaded.settings.theme).toBe('dark')
    expect(loaded.settings.volume).toBe(0.7)
    expect(loaded.settings.sound).toBe(true)
  })

  it('still never throws, whatever it is handed', () => {
    for (const raw of ['null', '[]', '"a string"', '42', '{"interval":{"config":null}}']) {
      expect(() => loadState(raw, 'UTC')).not.toThrow()
    }
  })
})
