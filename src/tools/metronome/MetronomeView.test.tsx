import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { startMetronome } from '../../lib/audio.ts'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState } from '../../store/types.ts'
import { MetronomeView } from './MetronomeView.tsx'

const stopMetronome = vi.fn()
vi.mock('../../lib/audio.ts', () => ({
  playSignal: vi.fn(),
  unlockAudio: vi.fn(),
  configureAudio: vi.fn(),
  startMetronome: vi.fn(() => stopMetronome),
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
        <MetronomeView />
      </TickerProvider>
    </StoreProvider>,
  )

describe('MetronomeView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    stopMetronome.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('starts the lookahead scheduler with the stored tempo and bar', () => {
    seed({ metronome: { bpm: 144, beatsPerBar: 3 } })
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(startMetronome).toHaveBeenCalledWith(144, 3, expect.any(Function))
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()
  })

  it('stops the scheduler on stop and on unmount', () => {
    seed()
    const { unmount } = mount()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(stopMetronome).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    unmount()
    expect(stopMetronome).toHaveBeenCalledTimes(2)
  })

  it('pulses each beat and accents the downbeat', () => {
    seed({ metronome: { bpm: 120, beatsPerBar: 4 } })
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    const onBeat = vi.mocked(startMetronome).mock.calls[0]![2]!

    act(() => {
      onBeat(0, 0)
    })
    expect(screen.getByLabelText('Beat 1').dataset.active).toBe('true')
    expect(screen.getByLabelText('Beat 1').dataset.accent).toBe('true')
    expect(screen.getByLabelText('Beat 2').dataset.active).toBe('false')

    act(() => {
      onBeat(1, 0.5)
    })
    expect(screen.getByLabelText('Beat 1').dataset.active).toBe('false')
    expect(screen.getByLabelText('Beat 2').dataset.active).toBe('true')
    expect(screen.getByLabelText('Beat 2').dataset.accent).toBe('false')
  })

  it('keeps tempo edits in the store for the next visit', () => {
    seed()
    mount()

    fireEvent.change(screen.getByRole('slider', { name: 'Tempo' }), { target: { value: '208' } })
    expect(screen.getByText('208 BPM')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(startMetronome).toHaveBeenLastCalledWith(208, 4, expect.any(Function))
  })
})
