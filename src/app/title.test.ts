import { describe, expect, it } from 'vitest'
import { buildTitle } from '../hooks/documentTitle.ts'
import { defaultState } from '../store/reducer.ts'
import type { AppState, CountdownItem } from '../store/types.ts'
import { titleInput } from './title.ts'

/** Half past nine, so the alarm below has an occurrence just behind it. */
const NOW = new Date(2026, 4, 6, 9, 0, 30).getTime()
const MIN = 60_000

const state = (patch: (base: AppState) => AppState): AppState => patch(defaultState('UTC'))

const withTimers = (base: AppState, timers: CountdownItem[]): AppState => ({
  ...base,
  countdown: { ...base.countdown, timers },
})

/** What the tab ends up saying — the string, not the input shape. */
const title = (app: AppState): string => buildTitle(titleInput(app, NOW), NOW)

describe('titleInput', () => {
  it('rests on the app name when nothing is going on', () => {
    expect(title(defaultState('UTC'))).toBe('tick')
  })

  it('counts down the soonest running timer', () => {
    expect(
      title(
        state((base) =>
          withTimers(base, [{ id: 'a', label: 'Tea', totalMs: 5 * MIN, endAt: NOW + 2 * MIN }]),
        ),
      ),
    ).toBe('2:00 · tick')
  })

  it('gives the tab to a ringing countdown, from any route', () => {
    expect(
      title(
        state((base) =>
          withTimers(base, [
            { id: 'a', label: 'Tea', totalMs: 5 * MIN, endAt: NOW + 2 * MIN },
            { id: 'b', label: 'Eggs', totalMs: 6 * MIN, endAt: NOW - 10_000 },
          ]),
        ),
      ),
    ).toBe('⏰ Eggs · tick')
  })

  it('drops a ringing timer once it has been stopped', () => {
    expect(
      title(
        state((base) =>
          withTimers(base, [
            { id: 'b', label: 'Eggs', totalMs: 6 * MIN, endAt: NOW - 10_000, silencedAt: NOW },
          ]),
        ),
      ),
    ).toBe('tick')
  })

  it('shows the phase of a running workout, but not a paused one', () => {
    const running = state((base) => ({
      ...base,
      interval: { ...base.interval, startedAt: NOW - 5_000 },
    }))
    expect(title(running)).toBe('READY · 0:05 · tick')

    const paused = state((base) => ({
      ...base,
      interval: { ...base.interval, pausedElapsedMs: 5_000 },
    }))
    expect(title(paused)).toBe('tick')
  })

  it('lets a ringing alarm outrank everything, workout included', () => {
    const app = state((base) => ({
      ...base,
      interval: { ...base.interval, startedAt: NOW - 5_000 },
      alarms: { alarms: [{ id: 'x', time: '09:00', days: [], enabled: true }] },
    }))
    expect(title(app)).toBe('⏰ 09:00 · tick')
  })
})
