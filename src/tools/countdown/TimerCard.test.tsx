import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { playSignal } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState } from '../../store/types.ts'
import type { CountdownItem } from '../../store/types.ts'
import { TimerCard } from './TimerCard.tsx'

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
const MIN = 60_000

/** Seed the store exactly as a reload would find it. */
const seed = (timers: CountdownItem[], settings?: Partial<AppState['settings']>): void => {
  const base = defaultState('UTC')
  const state: AppState = {
    ...base,
    settings: { ...base.settings, ...settings },
    countdown: { ...base.countdown, timers },
  }
  localStorage.setItem(STORAGE_KEY, serialize(state))
}

const mount = (id: string) =>
  render(
    <StoreProvider>
      <TickerProvider>
        <TimerCard id={id} />
      </TickerProvider>
    </StoreProvider>,
  )

describe('TimerCard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows the remaining time and pause freezes it', async () => {
    seed([{ id: 't1', label: 'Tea', totalMs: 2 * MIN, endAt: NOW + MIN }])
    mount('t1')

    expect(screen.getByText('1:00')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy()

    // Half a minute of wall clock later, a paused timer has not moved.
    vi.setSystemTime(NOW + 30_000)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('1:00')).toBeTruthy()
  })

  it('beeps and notifies exactly once when the countdown crosses zero', () => {
    seed([{ id: 't2', label: 'Egg', totalMs: 2_000, endAt: NOW + 1_000 }], {
      sound: true,
      notifications: true,
    })
    mount('t2')

    expect(playSignal).not.toHaveBeenCalled()

    vi.setSystemTime(NOW + 1_500)
    act(() => {
      vi.advanceTimersByTime(1_500)
    })

    expect(playSignal).toHaveBeenCalledTimes(1)
    expect(playSignal).toHaveBeenCalledWith('countdown-done')
    expect(fireNotification).toHaveBeenCalledTimes(1)
    expect(screen.getByText('0:00')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Restart' })).toBeTruthy()

    // More ticks must not re-fire a timer the store already marked fired.
    vi.setSystemTime(NOW + 5_000)
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(playSignal).toHaveBeenCalledTimes(1)
    expect(fireNotification).toHaveBeenCalledTimes(1)
  })

  it('restarts from the original duration', async () => {
    seed([{ id: 't3', label: 'Pause', totalMs: 2_000, endAt: NOW + 500 }])
    mount('t3')

    vi.setSystemTime(NOW + 800)
    act(() => {
      vi.advanceTimersByTime(800)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))

    // The ticker renders at 250 ms granularity — one more tick and the
    // restarted readout settles on the full original duration.
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByText('0:02')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
  })
})
