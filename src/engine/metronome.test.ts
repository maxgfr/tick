import { describe, expect, it } from 'vitest'
import {
  beatIndexAt,
  beatIntervalMs,
  beatPositionAt,
  isDownbeat,
  nthBeatTime,
  reanchor,
} from './metronome.ts'

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

describe('beatIndexAt', () => {
  it('counts beats from the origin, the first landing on it', () => {
    expect(beatIndexAt(1_000, 60, 1_000)).toBe(0)
    expect(beatIndexAt(1_000, 60, 1_999)).toBe(0)
    expect(beatIndexAt(1_000, 60, 2_000)).toBe(1)
    expect(beatIndexAt(1_000, 60, 5_500)).toBe(4)
  })

  it('survives a run that started long ago — the phase is derived, not counted', () => {
    const startedAt = 0
    // An hour of 120 BPM is 7200 beats; nothing accumulates, so nothing drifts.
    expect(beatIndexAt(startedAt, 120, 3_600_000)).toBe(7_200)
  })
})

describe('reanchor', () => {
  it('holds the beat position across a tempo change', () => {
    // Two and a half beats into a 60 BPM run when the tempo doubles.
    const moved = reanchor(0, 60, 120, 2_500)
    // The position must still read 2.5 — same beat, same fraction of it.
    expect(beatPositionAt(moved, 120, 2_500)).toBeCloseTo(2.5, 10)
    // And the next click lands one *new* interval later, not one old one.
    expect(nthBeatTime(moved, 120, 3)).toBeCloseTo(2_750, 10)
  })

  it('keeps the downbeat on the downbeat', () => {
    // Exactly on beat 8 of a 4/4 bar — a downbeat — when the tempo changes.
    const moved = reanchor(0, 100, 174, nthBeatTime(0, 100, 8))
    const at = nthBeatTime(0, 100, 8)
    expect(beatIndexAt(moved, 174, at)).toBe(8)
    expect(isDownbeat(beatIndexAt(moved, 174, at), 4)).toBe(true)
  })

  it('is a no-op when the tempo does not actually change', () => {
    expect(reanchor(1_234, 90, 90, 9_999)).toBeCloseTo(1_234, 10)
  })
})
