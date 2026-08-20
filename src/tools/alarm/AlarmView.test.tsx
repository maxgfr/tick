import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { playSignal } from '../../lib/audio.ts'
import { requestNotificationPermission } from '../../lib/notify.ts'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState } from '../../store/types.ts'
import { AlarmView } from './AlarmView.tsx'

vi.mock('../../lib/audio.ts', () => ({
  playSignal: vi.fn(),
  unlockAudio: vi.fn(),
  configureAudio: vi.fn(),
}))
vi.mock('../../lib/notify.ts', () => ({
  fireNotification: vi.fn(),
  notificationsSupported: () => true,
  notificationPermission: () => 'default' as const,
  requestNotificationPermission: vi.fn(async () => 'granted' as const),
}))

const seed = (state?: Partial<AppState>): void => {
  const base = defaultState('UTC')
  localStorage.setItem(STORAGE_KEY, serialize({ ...base, ...state }))
}

const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <AlarmView />
      </TickerProvider>
    </StoreProvider>,
  )

describe('AlarmView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('adds an alarm from the time input', () => {
    seed()
    mount()

    fireEvent.change(screen.getByRole('textbox', { name: 'Time' }), { target: { value: '07:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add alarm' }))

    expect(screen.getByText('07:30')).toBeTruthy()
  })

  it('refuses a malformed time out loud instead of ignoring the tap', () => {
    seed()
    mount()

    fireEvent.change(screen.getByRole('textbox', { name: 'Time' }), { target: { value: '25:99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add alarm' }))

    expect(screen.getByText(/couldn't read that time/i)).toBeTruthy()
    expect(screen.queryByRole('listitem')).toBeNull()

    // A corrected time clears the complaint and adds the alarm.
    fireEvent.change(screen.getByRole('textbox', { name: 'Time' }), { target: { value: '07:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add alarm' }))
    expect(screen.queryByText(/couldn't read that time/i)).toBeNull()
    expect(screen.getByText('07:30')).toBeTruthy()
  })

  it('toggles and removes alarms', () => {
    seed({
      alarms: { alarms: [{ id: 'a1', time: '07:30', days: [], enabled: true, lastRangAt: 0 }] },
    })
    mount()

    fireEvent.click(screen.getByRole('switch', { name: /07:30/ }))
    expect(screen.getByRole('switch', { name: /07:30/ }).getAttribute('aria-checked')).toBe('false')

    fireEvent.click(screen.getByRole('button', { name: 'Remove 07:30' }))
    expect(screen.queryByText('07:30')).toBeNull()
  })

  it('edits the days an alarm rings', () => {
    seed({
      alarms: { alarms: [{ id: 'a1', time: '07:30', days: [], enabled: true }] },
    })
    mount()

    const monday = screen.getByRole('button', { name: 'Mon' })
    expect(monday.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(monday)
    expect(monday.getAttribute('aria-pressed')).toBe('true')
  })

  it('shows a Missed badge for an occurrence missed while the app was closed', () => {
    // The occurrence at 07:30 today already passed 2 hours ago, unrung.
    const now = new Date(2025, 9, 8, 9, 30)
    vi.setSystemTime(now)
    seed({
      alarms: { alarms: [{ id: 'a1', time: '07:30', days: [], enabled: true }] },
    })
    mount()

    expect(screen.getByText('Missed')).toBeTruthy()
  })

  it('requests notification permission only from its button', () => {
    seed()
    mount()

    expect(requestNotificationPermission).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /enable notifications/i }))
    expect(requestNotificationPermission).toHaveBeenCalledTimes(1)
  })

  it('test-fires the alarm sound', () => {
    seed()
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Test sound' }))
    expect(playSignal).toHaveBeenCalledWith('alarm')
  })
})
