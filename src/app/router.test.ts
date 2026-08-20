import { describe, expect, it } from 'vitest'
import { ROUTES, parseHash, routeToHash } from './router.ts'

describe('parseHash', () => {
  it('lands on countdown for empty and bare hashes', () => {
    expect(parseHash('')).toBe('countdown')
    expect(parseHash('#')).toBe('countdown')
    expect(parseHash('#/')).toBe('countdown')
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

  it('falls back to countdown for unknown routes and noise', () => {
    expect(parseHash('#/nonsense')).toBe('countdown')
    expect(parseHash('#/countdown/extra/segments')).toBe('countdown')
    expect(parseHash('#garbage')).toBe('countdown')
  })
})

describe('routeToHash', () => {
  it('round-trips every route', () => {
    for (const route of ROUTES) {
      expect(parseHash(routeToHash(route))).toBe(route)
    }
  })

  it("uses the bare hash for the countdown, the app's landing screen", () => {
    expect(routeToHash('countdown')).toBe('#/')
  })
})
