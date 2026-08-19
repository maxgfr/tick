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
