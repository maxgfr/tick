import { describe, expect, it } from 'vitest'
import { buildTimeline, phaseAt, PRESETS, totalMs } from './intervals.ts'

const S = 1_000
const MIN = 60_000

const tabata = { prepareMs: 10 * S, workMs: 20 * S, restMs: 10 * S, rounds: 8, cooldownMs: 0 }

describe('buildTimeline', () => {
  it('expands prepare, work and rest into absolute phases', () => {
    const timeline = buildTimeline(tabata)
    // prepare + 8 work + 7 rest: no rest after the final round — the workout is over.
    expect(timeline).toHaveLength(1 + 8 + 7)

    const [prepare, work1, rest1, work2] = timeline
    expect(prepare).toMatchObject({ kind: 'prepare', startMs: 0, endMs: 10 * S })
    expect(work1).toMatchObject({ kind: 'work', round: 1, startMs: 10 * S, endMs: 30 * S })
    expect(rest1).toMatchObject({ kind: 'rest', round: 1, startMs: 30 * S, endMs: 40 * S })
    expect(work2).toMatchObject({ kind: 'work', round: 2, startMs: 40 * S, endMs: 60 * S })
  })

  it('omits the phases configured to zero', () => {
    const timeline = buildTimeline({
      prepareMs: 0,
      workMs: 30 * S,
      restMs: 0,
      rounds: 3,
      cooldownMs: 0,
    })
    expect(timeline).toHaveLength(3)
    expect(timeline.every((phase) => phase.kind === 'work')).toBe(true)
  })

  it('appends cooldown last', () => {
    const timeline = buildTimeline({ ...tabata, cooldownMs: 60 * S, rounds: 1 })
    const last = timeline.at(-1)
    // Single round: no rest, so cooldown follows work directly.
    expect(last).toMatchObject({ kind: 'cooldown', startMs: 30 * S, endMs: 90 * S })
  })

  it('totals Tabata at 4:00, prepare included, final rest excluded', () => {
    expect(totalMs(buildTimeline(tabata))).toBe(10 * S + 8 * 20 * S + 7 * 10 * S)
  })
})

describe('phaseAt', () => {
  const timeline = buildTimeline(tabata)

  it('finds the phase containing the elapsed time, boundaries half-open', () => {
    expect(phaseAt(timeline, 0)).toMatchObject({ kind: 'prepare' })
    expect(phaseAt(timeline, 10 * S)).toMatchObject({ kind: 'work', round: 1 })
    expect(phaseAt(timeline, 29_999)).toMatchObject({ kind: 'work', round: 1 })
    expect(phaseAt(timeline, 30 * S)).toMatchObject({ kind: 'rest', round: 1 })
    expect(phaseAt(timeline, 40 * S)).toMatchObject({ kind: 'work', round: 2 })
    // The last phase is round 8's work, not a trailing rest.
    expect(phaseAt(timeline, 10 * S + 7 * 30 * S + 20 * S - 1)).toMatchObject({
      kind: 'work',
      round: 8,
    })
  })

  it('returns null once the timeline is over', () => {
    expect(phaseAt(timeline, totalMs(timeline))).toBeNull()
    expect(phaseAt(timeline, totalMs(timeline) + MIN)).toBeNull()
  })

  it('survives the empty timeline', () => {
    expect(phaseAt([], 0)).toBeNull()
    expect(totalMs([])).toBe(0)
  })
})

describe('PRESETS', () => {
  it('ships Tabata, HIIT and EMOM with sane arithmetic', () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(['tabata', 'hiit', 'emom'])

    const tabataPreset = PRESETS[0]!
    expect(totalMs(buildTimeline(tabataPreset.config))).toBe(240 * S)

    const hiit = PRESETS[1]!.config
    expect(hiit).toMatchObject({ workMs: 30 * S, restMs: 30 * S, rounds: 10 })

    const emom = PRESETS[2]!.config
    expect(emom).toMatchObject({ workMs: 45 * S, restMs: 15 * S, rounds: 10 })
  })
})
