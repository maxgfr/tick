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
const setTempo = vi.fn()
vi.mock('../../lib/audio.ts', () => ({
  playSignal: vi.fn(),
  unlockAudio: vi.fn(),
  configureAudio: vi.fn(),
  audioReady: vi.fn(() => true),
  startMetronome: vi.fn(() => ({ stop: stopMetronome, setTempo })),
}))

vi.mock('../../lib/notify.ts', () => ({
  fireNotification: vi.fn(),
  notificationsSupported: () => false,
  notificationPermission: () => 'unsupported' as const,
  requestNotificationPermission: vi.fn(),
}))

/** The scheduler's `onBeat`, from the run at `call`. */
const onBeatOf = (call: number): ((beat: number) => void) =>
  vi.mocked(startMetronome).mock.calls[call]![0].onBeat!

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
    setTempo.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('starts the lookahead scheduler with the stored tempo and bar', () => {
    seed({ metronome: { bpm: 144, beatsPerBar: 3 } })
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(startMetronome).toHaveBeenCalledWith(
      expect.objectContaining({ bpm: 144, beatsPerBar: 3, startedAt: NOW }),
    )
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
    const onBeat = onBeatOf(0)

    act(() => {
      onBeat(0)
    })
    expect(screen.getByLabelText('Beat 1').dataset.active).toBe('true')
    expect(screen.getByLabelText('Beat 1').dataset.accent).toBe('true')
    expect(screen.getByLabelText('Beat 2').dataset.active).toBe('false')

    act(() => {
      onBeat(1)
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
    expect(startMetronome).toHaveBeenLastCalledWith(
      expect.objectContaining({ bpm: 208, beatsPerBar: 4 }),
    )
  })

  it('pushes a tempo edit into the live scheduler instead of rebuilding it', () => {
    seed()
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(startMetronome).toHaveBeenCalledTimes(1)

    // A drag: sixty change events, none of which may tear the scheduler down.
    for (let bpm = 100; bpm <= 160; bpm += 1) {
      fireEvent.change(screen.getByRole('slider', { name: 'Tempo' }), {
        target: { value: String(bpm) },
      })
    }

    expect(startMetronome).toHaveBeenCalledTimes(1)
    expect(stopMetronome).not.toHaveBeenCalled()
    expect(setTempo).toHaveBeenLastCalledWith(expect.objectContaining({ bpm: 160 }))
  })

  it('resumes a run found in storage on the beat it is actually on', () => {
    // A run started a minute ago, before a reload. The origin is handed to
    // the scheduler untouched, so the bar picks up where it really is rather
    // than restarting on one.
    seed({ metronome: { bpm: 96, beatsPerBar: 3, runningSince: NOW - 60_000 } })
    mount()

    expect(startMetronome).toHaveBeenCalledWith(
      expect.objectContaining({ bpm: 96, beatsPerBar: 3, startedAt: NOW - 60_000 }),
    )
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull()
  })

  it('keeps the run in the store, so leaving the view does not stop it', () => {
    seed()
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(stopMetronome).toHaveBeenCalledTimes(1)

    // Stopping is a store action too — restarting works from the same mount.
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(startMetronome).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()
  })
})
