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

/** Tap a key on the pad, by its visible digit or its accessible name. */
const press = (name: string): void => {
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Duration keypad' })).getByRole('button', { name }),
  )
}

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
        recents: [],
      },
    })
    mount()

    const list = screen.getByRole('list', { name: 'Running timers' })
    expect(within(list).getByText('Laundry')).toBeTruthy()
    expect(within(list).getByText('40:00')).toBeTruthy()
  })

  it('starts a labelled timer without any save step — recents keep the duration', () => {
    seed()
    mount()

    fireEvent.change(screen.getByRole('textbox', { name: 'Duration' }), {
      target: { value: '12m' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Label' }), {
      target: { value: 'Sourdough' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    const running = within(screen.getByRole('list', { name: 'Running timers' }))
    expect(running.getByText('12:00')).toBeTruthy()
    expect(running.getByText('Sourdough')).toBeTruthy()

    // Remembered under its own name — which is what replaced "Save preset".
    const recent = within(screen.getByRole('region', { name: 'Recent durations' }))
    expect(recent.getByRole('button', { name: 'Sourdough 12:00' })).toBeTruthy()
  })

  it('shifts digits in from the right, and shows what they mean', () => {
    seed()
    mount()

    press('5')
    expect(screen.getByLabelText('Duration')).toHaveProperty('value', '5')

    press('2')
    press('3')
    press('0')
    // 5230 reads as 52:30, not five thousand seconds.
    expect(screen.getByLabelText('Duration')).toHaveProperty('value', '5230')
    expect(screen.getByText('52:30')).toBeTruthy()
  })

  it('deletes the last digit and clears the whole entry', () => {
    seed()
    mount()

    for (const digit of ['1', '3', '0']) press(digit)
    expect(screen.getByText('1:30')).toBeTruthy()

    press('Delete last digit')
    expect(screen.getByLabelText('Duration')).toHaveProperty('value', '13')

    press('Clear')
    expect(screen.getByLabelText('Duration')).toHaveProperty('value', '')
    expect(screen.getByText('0:00')).toBeTruthy()
  })

  it('starts the timer the readout is showing', () => {
    seed()
    mount()

    for (const digit of ['2', '0', '0']) press(digit)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    const running = within(screen.getByRole('list', { name: 'Running timers' }))
    expect(running.getByText('2:00')).toBeTruthy()
    // The entry resets, ready for the next one.
    expect(screen.getByLabelText('Duration')).toHaveProperty('value', '')
  })

  it('still takes a typed duration, units and all', () => {
    seed()
    mount()

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '2m30s' } })
    expect(screen.getByText('2:30')).toBeTruthy()

    // A pad tap on top of typed text starts fresh instead of corrupting it.
    press('7')
    expect(screen.getByLabelText('Duration')).toHaveProperty('value', '7')
  })
})

describe('recent durations', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('remembers what you started, newest first and without repeats', () => {
    seed()
    mount()

    for (const value of ['1:00', '2:00', '1:00']) {
      fireEvent.change(screen.getByLabelText('Duration'), { target: { value } })
      fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    }

    const recent = within(screen.getByRole('region', { name: 'Recent durations' }))
    // Every chip carries its own remove button, hence the crosses.
    const chips = recent
      .getAllByRole('button')
      .map((node) => node.textContent)
      .filter((text) => text !== '×')
    expect(chips).toEqual(['1:00', '2:00'])
  })

  it('starts a timer straight from a recent chip', () => {
    seed()
    mount()

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '3:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    const recent = within(screen.getByRole('region', { name: 'Recent durations' }))
    fireEvent.click(recent.getByRole('button', { name: '3:00' }))

    const running = within(screen.getByRole('list', { name: 'Running timers' }))
    expect(running.getAllByText('3:00')).toHaveLength(2)
  })
})

describe('pruning a recent duration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('drops the chip you cross out and leaves the others', () => {
    seed()
    mount()

    for (const value of ['1:00', '2:00']) {
      fireEvent.change(screen.getByLabelText('Duration'), { target: { value } })
      fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    }

    const recent = () => within(screen.getByRole('region', { name: 'Recent durations' }))
    fireEvent.click(recent().getByRole('button', { name: 'Forget 1:00' }))

    expect(recent().queryByRole('button', { name: '1:00' })).toBeNull()
    expect(recent().getByRole('button', { name: '2:00' })).toBeTruthy()
  })

  it('takes the whole row away once the last one is gone', () => {
    seed()
    mount()

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '4:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    fireEvent.click(
      within(screen.getByRole('region', { name: 'Recent durations' })).getByRole('button', {
        name: 'Forget 4:00',
      }),
    )
    expect(screen.queryByRole('region', { name: 'Recent durations' })).toBeNull()
  })
})

describe('a remembered duration keeps its name', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  const start = (duration: string, label?: string): void => {
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: duration } })
    if (label !== undefined) {
      fireEvent.change(screen.getByLabelText('Label'), { target: { value: label } })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  }

  it('runs again under its own name, with no save step anywhere', () => {
    seed()
    mount()

    start('11:00', 'Pasta')
    const recent = within(screen.getByRole('region', { name: 'Recent durations' }))
    fireEvent.click(recent.getByRole('button', { name: 'Pasta 11:00' }))

    const running = within(screen.getByRole('list', { name: 'Running timers' }))
    expect(running.getAllByText('Pasta')).toHaveLength(2)
  })

  it('lets whatever is typed win over the remembered name', () => {
    seed()
    mount()

    start('11:00', 'Pasta')
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Risotto' } })
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Recent durations' })).getByRole('button', {
        name: 'Pasta 11:00',
      }),
    )

    const running = within(screen.getByRole('list', { name: 'Running timers' }))
    expect(running.getByText('Risotto')).toBeTruthy()
  })

  it('names the remove button after the chip it removes', () => {
    seed()
    mount()

    start('11:00', 'Pasta')
    const recent = within(screen.getByRole('region', { name: 'Recent durations' }))
    expect(recent.getByRole('button', { name: 'Forget Pasta 11:00' })).toBeTruthy()
  })
})
