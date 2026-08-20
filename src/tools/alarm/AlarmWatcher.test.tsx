import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { playSignal } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState } from '../../store/types.ts'
import { AlarmWatcher } from './AlarmWatcher.tsx'

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

// A Wednesday, one minute before the alarm.
const START = new Date(2025, 9, 8, 7, 29).getTime()
const MIN = 60_000

const seed = (state?: Partial<AppState>): void => {
  const base = defaultState('UTC')
  localStorage.setItem(STORAGE_KEY, serialize({ ...base, ...state }))
}

const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <AlarmWatcher />
      </TickerProvider>
    </StoreProvider>,
  )

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('AlarmWatcher', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(START)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  const withAlarm = (): void => {
    seed({
      settings: { ...defaultState('UTC').settings, notifications: true },
      alarms: { alarms: [{ id: 'a1', time: '07:30', days: [], enabled: true }] },
    })
  }

  it('rings when an alarm passes while the app is open', () => {
    withAlarm()
    mount()

    advance(2 * MIN)
    expect(screen.getByText('07:30')).toBeTruthy()
    expect(playSignal).toHaveBeenCalledWith('alarm')
    expect(fireNotification).toHaveBeenCalledTimes(1)
  })

  it('snoozes for five minutes and rings again', () => {
    withAlarm()
    mount()

    advance(2 * MIN)
    fireEvent.click(screen.getByRole('button', { name: /snooze 5/i }))
    expect(screen.queryByText('07:30')).toBeNull()

    advance(5 * MIN)
    expect(screen.getByText('07:30')).toBeTruthy()
  })

  it('dismiss marks the occurrence rung — no second ring', () => {
    withAlarm()
    mount()

    advance(2 * MIN)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('07:30')).toBeNull()

    advance(3 * MIN)
    expect(screen.queryByText('07:30')).toBeNull()
    expect(fireNotification).toHaveBeenCalledTimes(1)
  })

  it('catches up on an occurrence missed during a short absence', () => {
    withAlarm()
    vi.setSystemTime(START + 10 * MIN) // App reopened 8 minutes late.
    mount()

    advance(300)
    expect(screen.getByText('07:30')).toBeTruthy()
  })
})

describe('AlarmWatcher, snoozed repeatedly', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still rings after a third snooze, instead of dying inside its own window', () => {
    // Each snooze pushes the wake-up five minutes out. Measured from the
    // original occurrence, the third landed past the fifteen-minute catch-up
    // window and the alarm went quiet forever, with nothing on screen.
    const ring = new Date(2025, 9, 8, 7, 0)
    // `lastTrigger` wants the occurrence strictly in the past.
    vi.setSystemTime(ring.getTime() + 1_000)
    seed({ alarms: { alarms: [{ id: 'a1', time: '07:00', days: [], enabled: true }] } })
    mount()

    for (let round = 1; round <= 3; round += 1) {
      expect(screen.getByRole('alertdialog')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Snooze 5 min' }))
      expect(screen.queryByRole('alertdialog')).toBeNull()

      // Sleep through the snooze. `advanceTimersByTime` moves the mocked
      // clock too, so the wake-up lands where the snooze actually put it.
      act(() => {
        vi.advanceTimersByTime(5 * 60_000 + 1_000)
      })
    }

    // Fifteen minutes and three snoozes later, it is still ringing.
    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })

  it('keeps a snooze across a reload instead of ringing again on the spot', () => {
    const ring = new Date(2025, 9, 8, 7, 0)
    // `lastTrigger` wants the occurrence strictly in the past.
    vi.setSystemTime(ring.getTime() + 1_000)
    seed({ alarms: { alarms: [{ id: 'a1', time: '07:00', days: [], enabled: true }] } })
    const first = mount()

    fireEvent.click(screen.getByRole('button', { name: 'Snooze 5 min' }))

    // Two minutes pass, then the tab goes away. The store write is debounced,
    // so let it land — a real reload gets the same via the pagehide flush.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000)
    })
    first.unmount()

    mount()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('ends the snooze when the alarm is dismissed', () => {
    const ring = new Date(2025, 9, 8, 7, 0)
    // `lastTrigger` wants the occurrence strictly in the past.
    vi.setSystemTime(ring.getTime() + 1_000)
    seed({ alarms: { alarms: [{ id: 'a1', time: '07:00', days: [], enabled: true }] } })
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Snooze 5 min' }))
    act(() => {
      vi.advanceTimersByTime(5 * 60_000 + 1_000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()

    // The store write is debounced; let it land before reading it back.
    act(() => {
      vi.advanceTimersByTime(200)
    })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect('snoozedUntil' in stored.alarms.alarms[0]).toBe(false)
  })
})
