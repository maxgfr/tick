import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState } from '../../store/types.ts'
import { StopwatchView } from './StopwatchView.tsx'

vi.mock('../../lib/audio.ts', () => ({
  playSignal: vi.fn(),
  unlockAudio: vi.fn(),
  configureAudio: vi.fn(),
}))
vi.mock('../../lib/notify.ts', () => ({
  fireNotification: vi.fn(),
  notificationsSupported: () => false,
  notificationPermission: () => 'unsupported' as const,
  requestNotificationPermission: vi.fn(),
}))

const NOW = 1_760_000_000_000

const seed = (state?: Partial<AppState>): void => {
  const base = defaultState('UTC')
  localStorage.setItem(STORAGE_KEY, serialize({ ...base, ...state }))
}

const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <StopwatchView />
      </TickerProvider>
    </StoreProvider>,
  )

describe('StopwatchView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('starts with tenths and freezes on pause', () => {
    seed()
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText('0:00.0')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(1_232)
    })
    expect(screen.getByText('0:01.2')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByText('0:01.2')).toBeTruthy()
  })

  it('records laps with deltas and marks the fastest and slowest', () => {
    seed()
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    vi.advanceTimersByTime(10_000)
    fireEvent.click(screen.getByRole('button', { name: 'Lap' }))
    vi.advanceTimersByTime(5_000)
    fireEvent.click(screen.getByRole('button', { name: 'Lap' }))

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    // Newest lap first.
    expect(rows[0]!.textContent).toMatch(/0:15\.0/)
    expect(rows[0]!.textContent).toMatch(/0:05\.0/)
    expect(rows[0]!.textContent).toMatch(/fastest/i)
    expect(rows[1]!.textContent).toMatch(/0:10\.0/)
    expect(rows[1]!.textContent).toMatch(/slowest/i)
  })

  it('resumes a stopwatch restored from a previous session', () => {
    seed({ stopwatch: { accumulatedMs: 0, runningSince: NOW - 5_000, laps: [] } })
    mount()

    expect(screen.getByText('0:05.0')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
  })

  it('resets to zero and clears laps', () => {
    seed({ stopwatch: { accumulatedMs: 30_000, laps: [10_000, 30_000] } })
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('0:00.0')).toBeTruthy()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
