import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState } from '../../store/types.ts'
import { CountdownView } from './CountdownView.tsx'

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
        <CountdownView />
      </TickerProvider>
    </StoreProvider>,
  )

describe('CountdownView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('quick-adds a running timer from a duration', async () => {
    seed()
    mount()

    fireEvent.change(screen.getByRole('textbox', { name: 'Duration' }), { target: { value: '90' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Start a timer' }))

    const list = screen.getByRole('list', { name: 'Running timers' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('1:30')).toBeTruthy()
  })

  it('adds a timer from a preset chip', async () => {
    seed()
    mount()

    fireEvent.click(screen.getByRole('button', { name: /^Tea · green/ }))

    const list = screen.getByRole('list', { name: 'Running timers' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('3:00')).toBeTruthy()
  })

  it('rejects input that is not a duration', async () => {
    seed()
    mount()

    fireEvent.change(screen.getByRole('textbox', { name: 'Duration' }), {
      target: { value: 'later' },
    })
    fireEvent.submit(screen.getByRole('form', { name: 'Start a timer' }))

    expect(screen.queryByRole('list', { name: 'Running timers' })).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/couldn't understand/i)
  })

  it('seeds a timer restored from a previous session', () => {
    seed({
      countdown: {
        timers: [{ id: 'kept', label: 'Laundry', totalMs: 45 * 60_000, endAt: NOW + 40 * 60_000 }],
        presets: defaultState('UTC').countdown.presets,
      },
    })
    mount()

    const list = screen.getByRole('list', { name: 'Running timers' })
    expect(within(list).getByText('Laundry')).toBeTruthy()
    expect(within(list).getByText('40:00')).toBeTruthy()
  })

  it('saves a custom preset and starts it in one gesture', async () => {
    seed()
    mount()

    fireEvent.change(screen.getByRole('textbox', { name: 'Duration' }), {
      target: { value: '12m' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Label' }), {
      target: { value: 'Sourdough' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }))

    // Preset persisted as a chip, and its timer is running.
    expect(screen.getAllByRole('button', { name: /Sourdough/ }).length).toBeGreaterThan(0)
    expect(
      within(screen.getByRole('list', { name: 'Running timers' })).getByText('12:00'),
    ).toBeTruthy()
  })
})
