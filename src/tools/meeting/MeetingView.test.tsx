import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encodeMeeting } from '../../engine/meeting.ts'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState } from '../../store/types.ts'
import { MeetingView } from './MeetingView.tsx'

vi.mock('../../lib/audio.ts', () => ({
  playSignal: vi.fn(),
  unlockAudio: vi.fn(),
  configureAudio: vi.fn(),
  audioReady: () => true,
}))

// A Wednesday.
const NOW = Date.UTC(2026, 4, 6, 12, 0)

const seed = (meeting?: Partial<AppState['meeting']>): void => {
  const base = defaultState('Europe/Paris')
  localStorage.setItem(
    STORAGE_KEY,
    serialize({
      ...base,
      meeting: { ...base.meeting, day: '2026-05-06', ...meeting },
    }),
  )
}

const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <MeetingView />
      </TickerProvider>
    </StoreProvider>,
  )

describe('MeetingView', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } })
  })
  afterEach(() => {
    vi.useRealTimers()
    window.location.hash = ''
    vi.clearAllMocks()
  })

  it('starts with one row, the local zone, ready to add people', () => {
    seed()
    mount()
    expect(screen.getByRole('list', { name: 'Participants' })).toBeTruthy()
    expect(screen.getByText('Anchor')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Add a participant' })).toBeTruthy()
  })

  it('adds a city and gives it a column in the grid', () => {
    seed()
    mount()

    fireEvent.change(screen.getByRole('combobox', { name: 'Add a participant' }), {
      target: { value: 'America/New_York' },
    })

    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'New York' })).toBeTruthy()
  })

  it('covers the whole civil day in half-hour rows', () => {
    seed()
    mount()
    // 48 slot rows plus the header row.
    expect(screen.getAllByRole('row')).toHaveLength(49)
  })

  it('offers a window everyone can make, and pins it when chosen', () => {
    seed({
      participants: [
        { id: 'a', label: 'Paris', zoneId: 'Europe/Paris', startMin: 540, endMin: 1020 },
        { id: 'b', label: 'New York', zoneId: 'America/New_York', startMin: 540, endMin: 1020 },
      ],
    })
    mount()

    const best = within(screen.getByRole('region', { name: 'Best times' })).getAllByRole('button')
    expect(best.length).toBeGreaterThan(0)
    fireEvent.click(best[0]!)

    const chosen = screen.getByRole('region', { name: 'Chosen time' })
    // Paris 15:00 is New York 09:00 — both inside working hours.
    expect(within(chosen).getByText('15:00')).toBeTruthy()
    expect(within(chosen).getByText('09:00')).toBeTruthy()
  })

  it('says so plainly when no window exists, instead of inventing one', () => {
    seed({
      participants: [
        { id: 'a', label: 'London', zoneId: 'Europe/London', startMin: 540, endMin: 1020 },
        { id: 'b', label: 'Auckland', zoneId: 'Pacific/Auckland', startMin: 540, endMin: 1020 },
      ],
    })
    mount()
    expect(screen.getByText(/No window works for everyone/)).toBeTruthy()
  })

  it('copies a summary carrying every local time', () => {
    seed({
      participants: [
        { id: 'a', label: 'Paris', zoneId: 'Europe/Paris', startMin: 540, endMin: 1020 },
        { id: 'b', label: 'Tokyo', zoneId: 'Asia/Tokyo', startMin: 540, endMin: 1020 },
      ],
    })
    mount()

    fireEvent.click(screen.getAllByRole('button', { name: /^15:00/ })[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }))

    const written = vi.mocked(navigator.clipboard.writeText).mock.calls[0]?.[0] ?? ''
    expect(written).toContain('Paris')
    expect(written).toContain('15:00')
    expect(written).toContain('Tokyo')
    expect(written).toContain('22:00')
  })

  it('offers a shared roster rather than importing it behind the user’s back', () => {
    seed()
    const payload = encodeMeeting({
      v: 1,
      durationMin: 45,
      participants: [
        { id: 'x', label: 'Ana', zoneId: 'Europe/Lisbon', startMin: 540, endMin: 1020 },
        { id: 'y', label: 'Kenji', zoneId: 'Asia/Tokyo', startMin: 600, endMin: 1080 },
      ],
    })
    window.location.hash = `#/meeting/${payload}`
    mount()

    expect(screen.getByText(/A shared meeting — 2 people, 45 minutes/)).toBeTruthy()
    // Nothing has replaced the local roster yet.
    expect(screen.queryByDisplayValue('Ana')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Load it' }))
    expect(screen.getByDisplayValue('Ana')).toBeTruthy()
    expect(screen.getByDisplayValue('Kenji')).toBeTruthy()
  })

  it('ignores a payload it cannot vouch for, with no banner and no crash', () => {
    seed()
    window.location.hash = '#/meeting/not-a-real-payload'
    expect(() => mount()).not.toThrow()
    expect(screen.queryByText(/A shared meeting/)).toBeNull()
  })
})
