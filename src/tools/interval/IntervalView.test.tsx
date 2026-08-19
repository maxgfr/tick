import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { playSignal } from '../../lib/audio.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import { IntervalView } from './IntervalView.tsx'

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

const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <IntervalView />
      </TickerProvider>
    </StoreProvider>,
  )

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('IntervalView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('previews the timeline total for the default config', () => {
    // 10s prepare + 8 × 30s work + 7 × 30s rest = 7:40.
    mount()

    expect(screen.getByText(/7:40/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
  })

  it('applies a workout preset', () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Tabata' }))
    // 10 + 8×20 + 7×10 = 240s.
    expect(screen.getByText(/4:00/)).toBeTruthy()
  })

  it('runs through phases with a distinct beep per transition', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText('READY')).toBeTruthy()

    advance(11_000)
    expect(screen.getByText('WORK')).toBeTruthy()
    expect(screen.getByText(/round 1 of 8/i)).toBeTruthy()
    expect(playSignal).toHaveBeenCalledWith('phase-work')

    advance(30_000)
    expect(screen.getByText('REST')).toBeTruthy()
    expect(playSignal).toHaveBeenCalledWith('phase-rest')

    // Jump to the very end of the workout.
    advance(419_000)
    expect(screen.getByText('DONE')).toBeTruthy()
    expect(playSignal).toHaveBeenCalledWith('phase-end')
    expect(playSignal).toHaveBeenCalledTimes(3)
  })

  it('freezes the phase while paused', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    advance(11_000)
    expect(screen.getByText('WORK')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    advance(60_000)
    expect(screen.getByText('WORK')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    advance(29_000)
    expect(screen.getByText('REST')).toBeTruthy()
  })
})
