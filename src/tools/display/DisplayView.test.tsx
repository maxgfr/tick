import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { remainingMs } from '../../engine/countdown.ts'
import { formatClock } from '../../engine/duration.ts'
import { buildTimeline, phaseAt } from '../../engine/intervals.ts'
import { zonedParts } from '../../engine/timezones.ts'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { toggleFullscreen } from '../../lib/fullscreen.ts'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState, CountdownItem } from '../../store/types.ts'
import { DisplayView } from './DisplayView.tsx'

vi.mock('../../lib/audio.ts', () => ({
  playSignal: vi.fn(),
  unlockAudio: vi.fn(),
  configureAudio: vi.fn(),
}))
vi.mock('../../lib/fullscreen.ts', () => ({
  isFullscreen: () => false,
  toggleFullscreen: vi.fn(),
  onFullscreenChange: () => () => {},
}))

const START = new Date(2025, 9, 8, 7, 30).getTime()
const MIN = 60_000

const timer = (label: string, msLeft: number): CountdownItem => ({
  id: label,
  label,
  totalMs: msLeft,
  endAt: START + msLeft,
})

const seed = (state?: Partial<AppState>): void => {
  localStorage.setItem(STORAGE_KEY, serialize({ ...defaultState('UTC'), ...state }))
}

const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <DisplayView />
      </TickerProvider>
    </StoreProvider>,
  )

/**
 * The readout is a Readout: its tiles are aria-hidden and a single
 * sr-only twin carries the value, so plain getByText matches exactly once.
 */
const readoutShowing = (text: string) => screen.getByText(text)

describe('DisplayView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(START)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows the soonest-ending running countdown', () => {
    seed({
      countdown: {
        timers: [timer('Pasta', 11 * MIN), timer('Tea', 30_000)],
        presets: [],
        recents: [],
      },
    })
    mount()

    expect(screen.getByText('Tea')).toBeTruthy()
    expect(readoutShowing(formatClock(remainingMs(timer('Tea', 30_000), START)))).toBeTruthy()
    expect(screen.queryByText('Pasta')).toBeNull()
  })

  it('shows the active interval phase when no countdown runs', () => {
    seed({
      interval: {
        config: defaultState('UTC').interval.config,
        startedAt: START - 5_000,
      },
    })
    mount()

    const timeline = buildTimeline(defaultState('UTC').interval.config)
    const phase = phaseAt(timeline, 5_000)!
    expect(screen.getByText('READY')).toBeTruthy()
    expect(readoutShowing(formatClock(phase.endMs - 5_000))).toBeTruthy()
  })

  it('falls back to the local wall clock when nothing runs', () => {
    seed()
    mount()

    const parts = zonedParts(Intl.DateTimeFormat().resolvedOptions().timeZone, new Date(START))
    expect(
      readoutShowing(
        `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
      ),
    ).toBeTruthy()
  })

  it('offers fullscreen', () => {
    seed()
    mount()

    fireEvent.click(screen.getByRole('button', { name: /fullscreen/i }))
    expect(toggleFullscreen).toHaveBeenCalledTimes(1)
  })
})

describe('DisplayView, defensively', () => {
  it('survives an interval config with every phase at zero', () => {
    // `buildTimeline` drops zero-length phases, so this config yields an empty
    // timeline. Reaching past `totalMs` for `.at(-1)!.endMs` threw on every
    // render — and with no error boundary, that is the whole app gone white.
    seed({
      interval: {
        config: { prepareMs: 0, workMs: 0, restMs: 0, rounds: 1, cooldownMs: 0 },
        startedAt: START,
      },
    })

    expect(() => mount()).not.toThrow()
    // With nothing to run it falls through to the wall clock, as designed.
    expect(screen.getByLabelText('Display')).toBeTruthy()
  })

  it('survives it while idle too — the crash did not need a running interval', () => {
    seed({
      interval: { config: { prepareMs: 0, workMs: 0, restMs: 0, rounds: 3, cooldownMs: 0 } },
    })
    expect(() => mount()).not.toThrow()
  })
})
