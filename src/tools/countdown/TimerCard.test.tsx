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

  it('notifies exactly once when the countdown crosses zero, and never beeps', () => {
    seed([{ id: 't2', label: 'Egg', totalMs: 2_000, endAt: NOW + 1_000 }], {
      sound: true,
      notifications: true,
    })
    mount('t2')

    expect(fireNotification).not.toHaveBeenCalled()

    vi.setSystemTime(NOW + 1_500)
    act(() => {
      vi.advanceTimersByTime(1_500)
    })

    expect(fireNotification).toHaveBeenCalledTimes(1)
    expect(screen.getByText('0:00')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Restart' })).toBeTruthy()

    // More ticks must not re-fire a timer the store already marked fired.
    vi.setSystemTime(NOW + 5_000)
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(fireNotification).toHaveBeenCalledTimes(1)

    // The ring belongs to the board, not to the card — one loop, however
    // many cards finish at once.
    expect(playSignal).not.toHaveBeenCalled()
  })

  it('offers Stop while it rings, and only while it rings', () => {
    seed([{ id: 't4', label: 'Egg', totalMs: 2_000, endAt: NOW - 1_000, firedAt: NOW - 1_000 }])
    mount('t4')

    expect(screen.getByText(/^Ringing/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull()
    expect(screen.getByText(/^Done/)).toBeTruthy()
    // Stopping the ring is not stopping the timer: the card stays put.
    expect(screen.getByRole('button', { name: 'Restart' })).toBeTruthy()
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

describe('TimerCard, restarted', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('fires again the second time it finishes', () => {
    // The fired guard used to be keyed by `timer.id`, which never changes on
    // restart — so every run after the first was silent.
    seed([{ id: 't1', label: 'Eggs', totalMs: MIN, endAt: NOW + MIN }], { notifications: true })
    mount('t1')

    // First completion.
    act(() => {
      vi.setSystemTime(NOW + MIN + 1_000)
      vi.advanceTimersByTime(300)
    })
    expect(fireNotification).toHaveBeenCalledTimes(1)

    // Restart, then let it run out again.
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    act(() => {
      vi.setSystemTime(NOW + MIN + 1_000 + MIN + 1_000)
      vi.advanceTimersByTime(300)
    })

    expect(fireNotification).toHaveBeenCalledTimes(2)
    // And it is ringing again — a run that was stopped last time still rings.
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()
  })
})
