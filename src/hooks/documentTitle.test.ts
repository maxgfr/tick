import { describe, expect, it } from 'vitest'
import { buildTitle } from './documentTitle.ts'

const NOW = 1_000_000
const MIN = 60_000

const running = (label: string, left: number) => ({
  id: label,
  label,
  totalMs: 5 * MIN,
  endAt: NOW + left,
})

describe('buildTitle', () => {
  it('rests on the app name when nothing runs', () => {
    expect(buildTitle({ timers: [] }, NOW)).toBe('tick')
  })

  it('shows the soonest running countdown', () => {
    const timers = [running('Slow', 9 * MIN), running('Soon', 2 * MIN)]
    expect(buildTitle({ timers }, NOW)).toBe('2:00 · tick')
  })

  it('ignores finished and paused timers', () => {
    const timers = [
      { id: 'done', label: 'Done', totalMs: MIN, endAt: NOW - 1 },
      { id: 'paused', label: 'Paused', totalMs: MIN, pausedRemainingMs: MIN },
    ]
    expect(buildTitle({ timers }, NOW)).toBe('tick')
  })

  it('a ringing countdown takes the tab from a running one', () => {
    const timers = [running('Tea', MIN)]
    expect(buildTitle({ timers, ringingTimer: 'Eggs' }, NOW)).toBe('⏰ Eggs · tick')
  })

  it('a running interval outranks countdowns', () => {
    const timers = [running('Tea', MIN)]
    expect(buildTitle({ timers, interval: { phase: 'work', remainingMs: 12_000 } }, NOW)).toBe(
      'WORK · 0:12 · tick',
    )
  })

  it('a ringing alarm outranks everything', () => {
    expect(
      buildTitle(
        {
          timers: [running('Tea', MIN)],
          interval: { phase: 'rest', remainingMs: 5_000 },
          ringingAlarm: '07:30',
        },
        NOW,
      ),
    ).toBe('⏰ 07:30 · tick')
  })
})
