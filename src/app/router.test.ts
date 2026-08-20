import { describe, expect, it } from 'vitest'
import { ROUTES, parseHash, parseParam, routeToHash } from './router.ts'

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

describe('the payload segment', () => {
  it('returns everything after the route, and nothing when there is none', () => {
    expect(parseParam('#/meeting/AbC-_123')).toBe('AbC-_123')
    expect(parseParam('#/meeting')).toBe('')
    expect(parseParam('#/')).toBe('')
    expect(parseParam('')).toBe('')
    // A payload with a slash in it survives intact.
    expect(parseParam('#/meeting/a/b')).toBe('a/b')
  })

  it('builds a hash carrying a payload, and leaves the plain form alone', () => {
    expect(routeToHash('meeting', 'AbC')).toBe('#/meeting/AbC')
    expect(routeToHash('meeting')).toBe('#/meeting')
    expect(routeToHash('countdown')).toBe('#/')
    // The landing route needs its name back once it carries something.
    expect(routeToHash('countdown', 'x')).toBe('#/countdown/x')
  })

  it('round-trips every route through a payload-bearing hash', () => {
    for (const route of ROUTES) {
      expect(parseHash(routeToHash(route, 'payload'))).toBe(route)
    }
  })
})
