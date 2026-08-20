import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { zonedParts } from '../../engine/timezones.ts'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState } from '../../store/types.ts'
import { WorldClockView } from './WorldClockView.tsx'

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

// The instant is pinned; whether each zone is in daytime follows from the
// engine, not from a hand-computed comment.
const NOW = 1_760_000_000_000

const seed = (state?: Partial<AppState>): void => {
  const base = defaultState('UTC')
  localStorage.setItem(STORAGE_KEY, serialize({ ...base, ...state }))
}

const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <WorldClockView />
      </TickerProvider>
    </StoreProvider>,
  )

const hhmm = (zone: string): string => {
  const parts = zonedParts(zone, new Date(NOW))
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

const dayTitle = (zone: string): string => {
  const { hour } = zonedParts(zone, new Date(NOW))
  return hour >= 7 && hour < 19 ? 'Daytime' : 'Night'
}

describe('WorldClockView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('welcomes an empty board with something to do, not a blank column', () => {
    seed({ world: { zoneIds: [] } })
    mount()

    expect(screen.getByText(/no clocks yet/i)).toBeTruthy()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('lists the restored zones with their local time and day or night', () => {
    seed({ world: { zoneIds: ['UTC', 'Europe/Paris', 'Asia/Tokyo'] } })
    mount()

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getByText(hhmm('UTC'))).toBeTruthy()
    expect(within(rows[1]!).getByText(hhmm('Europe/Paris'))).toBeTruthy()
    expect(within(rows[2]!).getByText(hhmm('Asia/Tokyo'))).toBeTruthy()

    expect(within(rows[1]!).getByTitle(dayTitle('Europe/Paris'))).toBeTruthy()
    expect(within(rows[2]!).getByTitle(dayTitle('Asia/Tokyo'))).toBeTruthy()
  })

  it('adds a zone from the curated picker', () => {
    seed({ world: { zoneIds: ['UTC'] } })
    mount()

    fireEvent.change(screen.getByRole('combobox', { name: 'Add a timezone' }), {
      target: { value: 'America/New_York' },
    })

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[1]!).getByText('New York')).toBeTruthy()
  })

  it('removes a zone', () => {
    seed({ world: { zoneIds: ['UTC', 'Europe/Paris'] } })
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Paris' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('moves a zone up without wrapping', () => {
    seed({ world: { zoneIds: ['UTC', 'Europe/Paris', 'Asia/Tokyo'] } })
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Move Tokyo up' }))
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]!).getByText('UTC')).toBeTruthy()
    expect(within(rows[1]!).getByText('Tokyo')).toBeTruthy()
    expect(within(rows[2]!).getByText('Paris')).toBeTruthy()

    // Edge: UTC cannot move higher.
    fireEvent.click(screen.getByRole('button', { name: 'Move UTC up' }))
    expect(within(screen.getAllByRole('listitem')[0]!).getByText('UTC')).toBeTruthy()
  })
})
