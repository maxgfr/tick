import { describe, expect, it } from 'vitest'
import { formatClock, formatHuman, parseDuration } from './duration.ts'

const MIN = 60_000
const HOUR = 3_600_000

describe('parseDuration', () => {
  it('reads a bare number as seconds', () => {
    expect(parseDuration('90')).toBe(90_000)
    expect(parseDuration('5')).toBe(5_000)
    expect(parseDuration('  12  ')).toBe(12_000)
  })

  it('reads m:ss with two colon parts', () => {
    expect(parseDuration('1:30')).toBe(90_000)
    expect(parseDuration('0:45')).toBe(45_000)
    expect(parseDuration('25:00')).toBe(25 * MIN)
  })

  it('reads h:mm:ss with three colon parts', () => {
    expect(parseDuration('1:30:00')).toBe(HOUR + 30 * MIN)
    expect(parseDuration('0:06:30')).toBe(6 * MIN + 30_000)
  })

  it('reads unit suffixes and combinations', () => {
    expect(parseDuration('45s')).toBe(45_000)
    expect(parseDuration('25m')).toBe(25 * MIN)
    expect(parseDuration('2h')).toBe(2 * HOUR)
    expect(parseDuration('1h30m')).toBe(HOUR + 30 * MIN)
    expect(parseDuration('1h 30m 15s')).toBe(HOUR + 30 * MIN + 15_000)
    expect(parseDuration('90 m')).toBe(90 * MIN)
  })

  it('rejects the unparseable and the empty', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('   ')).toBeNull()
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('1x')).toBeNull()
    expect(parseDuration('h30')).toBeNull()
    expect(parseDuration('1:2:3:4')).toBeNull()
    expect(parseDuration('-5')).toBeNull()
    expect(parseDuration('1:')).toBeNull()
  })
})

describe('formatClock', () => {
  it('renders under an hour as m:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(45_000)).toBe('0:45')
    expect(formatClock(90_000)).toBe('1:30')
    expect(formatClock(6 * MIN + 30_000)).toBe('6:30')
  })

  it('renders an hour and up as h:mm:ss with padded minutes', () => {
    expect(formatClock(HOUR)).toBe('1:00:00')
    expect(formatClock(HOUR + 30_000)).toBe('1:00:30')
    expect(formatClock(2 * HOUR + 5 * MIN)).toBe('2:05:00')
  })

  it('adds tenths when asked', () => {
    expect(formatClock(90_123, { tenths: true })).toBe('1:30.1')
    // Floor, like every stopwatch: the tenth digit flips when the tenth completes.
    expect(formatClock(45_999, { tenths: true })).toBe('0:45.9')
  })

  it('can be forced to show hours', () => {
    expect(formatClock(90_000, { forceHours: true })).toBe('0:01:30')
  })
})

describe('formatHuman', () => {
  it('composes at most two significant units', () => {
    expect(formatHuman(45_000)).toBe('45s')
    expect(formatHuman(25 * MIN)).toBe('25m')
    expect(formatHuman(HOUR + 30 * MIN)).toBe('1h 30m')
    expect(formatHuman(2 * HOUR + 5 * MIN + 3_000)).toBe('2h 5m')
  })

  it('renders zero honestly', () => {
    expect(formatHuman(0)).toBe('0s')
  })
})

describe('negative durations', () => {
  it('formats the clock as a signed magnitude, not digit by digit', () => {
    // The calculator is documented to go negative; these used to read
    // "-1:00", "-2:-30" and "-2:-30" — the last one losing its hour entirely.
    expect(formatClock(-60_000)).toBe('-1:00')
    expect(formatClock(-90_000)).toBe('-1:30')
    expect(formatClock(-3_690_000)).toBe('-1:01:30')
    expect(formatClock(-1_500)).toBe('-0:02')
  })

  it('forces hours on the negative side too — the string the Copy button writes', () => {
    expect(formatClock(-90_000, { forceHours: true })).toBe('-0:01:30')
    expect(formatClock(-3_690_000, { forceHours: true })).toBe('-1:01:30')
  })

  it('phrases a negative duration instead of clamping it to zero', () => {
    // Clamping here while the clock line showed "-1:30" gave one expression
    // two different answers on two adjacent lines.
    expect(formatHuman(-90_000)).toBe('-1m 30s')
    expect(formatHuman(-3_690_000)).toBe('-1h 1m')
    expect(formatHuman(0)).toBe('0s')
  })

  it('leaves positive durations exactly as they were', () => {
    expect(formatClock(90_000)).toBe('1:30')
    expect(formatClock(3_690_000)).toBe('1:01:30')
    expect(formatHuman(90_000)).toBe('1m 30s')
  })
})
