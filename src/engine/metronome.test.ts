import { describe, expect, it } from 'vitest'
import { beatIntervalMs, isDownbeat, nthBeatTime } from './metronome.ts'

describe('beatIntervalMs', () => {
  it('derives the interval from the tempo', () => {
    expect(beatIntervalMs(60)).toBe(1000)
    expect(beatIntervalMs(120)).toBe(500)
    expect(beatIntervalMs(20)).toBe(3000)
    expect(beatIntervalMs(300)).toBe(200)
  })
})

describe('nthBeatTime', () => {
  it('places beat n at start + n intervals', () => {
    expect(nthBeatTime(1_000, 60, 0)).toBe(1000)
    expect(nthBeatTime(1_000, 60, 3)).toBe(4000)
    expect(nthBeatTime(0, 120, 5)).toBe(2500)
  })
})

describe('isDownbeat', () => {
  it('marks every first beat of the bar, counting from zero', () => {
    expect(isDownbeat(0, 4)).toBe(true)
    expect(isDownbeat(4, 4)).toBe(true)
    expect(isDownbeat(8, 4)).toBe(true)
    expect(isDownbeat(1, 4)).toBe(false)
    expect(isDownbeat(3, 4)).toBe(false)
    expect(isDownbeat(7, 4)).toBe(false)
  })

  it('makes every beat a downbeat in 1/1', () => {
    expect(isDownbeat(0, 1)).toBe(true)
    expect(isDownbeat(5, 1)).toBe(true)
  })
})
