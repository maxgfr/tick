import { describe, expect, it } from 'vitest'
import { parseHash, routeToHash } from './router.ts'

describe('parseHash', () => {
  it('lands on home for empty and bare hashes', () => {
    expect(parseHash('')).toBe('home')
    expect(parseHash('#')).toBe('home')
    expect(parseHash('#/')).toBe('home')
  })

  it('reads each tool route', () => {
    expect(parseHash('#/countdown')).toBe('countdown')
    expect(parseHash('#/stopwatch')).toBe('stopwatch')
    expect(parseHash('#/interval')).toBe('interval')
    expect(parseHash('#/metronome')).toBe('metronome')
    expect(parseHash('#/world')).toBe('world')
    expect(parseHash('#/calculator')).toBe('calculator')
    expect(parseHash('#/alarm')).toBe('alarm')
    expect(parseHash('#/display')).toBe('display')
    expect(parseHash('#/settings')).toBe('settings')
  })

  it('falls back to home for unknown routes and noise', () => {
    expect(parseHash('#/nonsense')).toBe('home')
    expect(parseHash('#/countdown/extra/segments')).toBe('countdown')
    expect(parseHash('#garbage')).toBe('home')
  })
})

describe('routeToHash', () => {
  it('round-trips every route', () => {
    for (const route of [
      'home',
      'countdown',
      'stopwatch',
      'interval',
      'metronome',
      'world',
      'calculator',
      'alarm',
      'display',
      'settings',
    ] as const) {
      expect(parseHash(routeToHash(route))).toBe(route)
    }
  })

  it('uses the bare hash for home', () => {
    expect(routeToHash('home')).toBe('#/')
  })
})
