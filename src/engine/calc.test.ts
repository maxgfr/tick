import { describe, expect, it } from 'vitest'
import { evaluateDuration } from './calc.ts'

const MIN = 60_000
const HOUR = 3_600_000

describe('evaluateDuration', () => {
  it('passes a single term through', () => {
    expect(evaluateDuration('45m')).toBe(45 * MIN)
    expect(evaluateDuration('1:30')).toBe(90_000)
    expect(evaluateDuration('90')).toBe(90_000)
  })

  it('adds and subtracts left to right', () => {
    expect(evaluateDuration('1:30 + 45m')).toBe(90_000 + 45 * MIN)
    expect(evaluateDuration('2h - 30m')).toBe(2 * HOUR - 30 * MIN)
    expect(evaluateDuration('1h 30m + 45m - 20s')).toBe(HOUR + 30 * MIN + 45 * MIN - 20_000)
  })

  it('tolerates extra spacing', () => {
    expect(evaluateDuration('  1:30   +45m  ')).toBe(90_000 + 45 * MIN)
  })

  it('may go negative', () => {
    expect(evaluateDuration('30m - 1h')).toBe(-30 * MIN)
  })

  it('rejects what is not arithmetic on durations', () => {
    expect(evaluateDuration('')).toBeNull()
    expect(evaluateDuration('1:30 +')).toBeNull()
    expect(evaluateDuration('+ 45m')).toBeNull()
    expect(evaluateDuration('45m * 2')).toBeNull()
    expect(evaluateDuration('hello')).toBeNull()
    expect(evaluateDuration('1:30 45m')).toBeNull()
    expect(evaluateDuration('1:30 + abc')).toBeNull()
  })
})
