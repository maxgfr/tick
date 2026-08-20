import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { playSignal } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import type { AppState, CountdownItem } from '../../store/types.ts'
import { CountdownWatcher } from './CountdownWatcher.tsx'
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
  localStorage.setItem(
    STORAGE_KEY,
    serialize({
      ...base,
      settings: { ...base.settings, ...settings },
      countdown: { ...base.countdown, timers },
    }),
  )
}

/**
 * The watcher on its own — which is the point of it. No board is mounted,
 * exactly as when the user has walked off to another tool.
 */
const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <CountdownWatcher />
      </TickerProvider>
    </StoreProvider>,
  )

/** The watcher plus one card, the way the countdown board composes them. */
const mountWithCard = (id: string) =>
  render(
    <StoreProvider>
      <TickerProvider>
        <CountdownWatcher />
        <TimerCard id={id} />
      </TickerProvider>
    </StoreProvider>,
  )

/** How many rings have been heard so far. */
const rings = (): number => vi.mocked(playSignal).mock.calls.length

const advanceTo = (offset: number, by: number): void => {
  act(() => {
    vi.setSystemTime(NOW + offset)
    vi.advanceTimersByTime(by)
  })
}

describe('CountdownWatcher', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('rings with no board on screen, and keeps ringing until it is stopped', () => {
    seed([{ id: 'r1', label: 'Eggs', totalMs: 2_000, endAt: NOW + 1_000 }])
    mount()

    expect(playSignal).not.toHaveBeenCalled()

    advanceTo(1_200, 300)
    expect(playSignal).toHaveBeenCalledWith('countdown-done')
    expect(rings()).toBe(1)
    expect(screen.getByRole('alert', { name: 'Timer ringing' }).textContent).toContain('Eggs')

    // The whole point: one beep is a beep you miss.
    advanceTo(6_200, 5_000)
    expect(rings()).toBeGreaterThan(2)

    const heard = rings()
    fireEvent.click(screen.getByRole('button', { name: 'Stop ringing' }))
    advanceTo(16_200, 10_000)

    expect(rings()).toBe(heard)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('rings once for two timers finishing together, and stops both at a tap', () => {
    seed([
      { id: 'r1', label: 'Eggs', totalMs: 2_000, endAt: NOW + 1_000 },
      { id: 'r2', label: 'Toast', totalMs: 2_000, endAt: NOW + 1_000 },
    ])
    mount()

    advanceTo(1_200, 300)
    advanceTo(4_200, 3_000)

    // Two timers, one voice — 1.5s apart, not two overlapping loops.
    expect(rings()).toBe(3)
    expect(screen.getByRole('alert').textContent).toContain('2 timers')

    fireEvent.click(screen.getByRole('button', { name: 'Stop ringing' }))
    advanceTo(9_200, 5_000)
    expect(rings()).toBe(3)
  })

  it('says nothing about a timer that ran out while the tab was closed', () => {
    seed([{ id: 'r3', label: 'Laundry', totalMs: 45 * MIN, endAt: NOW - 30 * MIN }])
    mount()

    advanceTo(2_000, 2_000)

    expect(playSignal).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('stays silent when sound is off, and still says it is ringing', () => {
    seed([{ id: 'r4', label: 'Eggs', totalMs: 2_000, endAt: NOW + 1_000 }], { sound: false })
    mount()

    advanceTo(4_200, 3_300)

    expect(playSignal).not.toHaveBeenCalled()
    // Muted is not dealt with: the bar and its Stop are still there.
    expect(screen.getByRole('button', { name: 'Stop ringing' })).toBeTruthy()
  })

  it('notifies once as the timer crosses zero, whatever the tick rate', () => {
    seed([{ id: 'r5', label: 'Egg', totalMs: 2_000, endAt: NOW + 1_000 }], { notifications: true })
    mount()

    expect(fireNotification).not.toHaveBeenCalled()

    advanceTo(1_500, 1_500)
    expect(fireNotification).toHaveBeenCalledTimes(1)

    // More ticks must not re-announce a timer the store already marked fired.
    advanceTo(5_000, 2_000)
    expect(fireNotification).toHaveBeenCalledTimes(1)
  })

  it('rings and notifies again the second time a timer finishes', () => {
    // The dedupe is keyed by the *run*: `endAt` is re-stamped on restart while
    // `id` never changes, so keying by id used to silence every run but the
    // first — no beep, no notification, `firedAt` undefined for good.
    seed([{ id: 't1', label: 'Eggs', totalMs: MIN, endAt: NOW + MIN }], { notifications: true })
    mountWithCard('t1')

    advanceTo(MIN + 1_000, 300)
    expect(fireNotification).toHaveBeenCalledTimes(1)
    expect(rings()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    advanceTo(2 * MIN + 2_000, 300)

    expect(fireNotification).toHaveBeenCalledTimes(2)
    expect(rings()).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: 'Stop ringing' })).toBeTruthy()
  })

  it('leaves the card its own Stop, one timer at a time', () => {
    seed([
      { id: 't1', label: 'Eggs', totalMs: 2_000, endAt: NOW - 1_000, firedAt: NOW - 1_000 },
      { id: 't2', label: 'Toast', totalMs: 2_000, endAt: NOW - 1_000, firedAt: NOW - 1_000 },
    ])
    mountWithCard('t1')

    advanceTo(500, 300)
    expect(screen.getByRole('alert').textContent).toContain('2 timers')

    // The card's Stop silences its own timer; the other one keeps ringing.
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    advanceTo(1_000, 300)
    expect(screen.getByRole('alert').textContent).toContain('Toast')
  })
})
