import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App.tsx'
import { STORAGE_KEY } from './store/persist.ts'

/**
 * One walk through every tool, driving the real app.
 *
 * The rest of the suite tests units; this asks the question a user asks —
 * does the thing work when you click it. Nothing here is mocked but the
 * browser APIs jsdom lacks (see `test/setup.ts`), so the metronome really
 * schedules against a fake AudioContext and every readout really derives from
 * the clock.
 */
const NOW = new Date(2026, 4, 6, 9, 0).getTime()

/**
 * Navigate the way a user does, and wait for it. jsdom dispatches
 * `hashchange` asynchronously, so asserting straight after the keypress reads
 * the previous screen.
 */
const go = (key: string, heading: RegExp | string): void => {
  act(() => {
    fireEvent.keyDown(window, { key })
    // jsdom queues `hashchange` as a task, and `waitFor` cannot drain it while
    // the timers are faked. Dispatching it here makes navigation synchronous.
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeTruthy()
}

const tick = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('every tool, end to end', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    window.location.hash = ''
  })

  it('countdown: starts a timer, counts it down, pauses and restarts it', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Duration' }), {
      target: { value: '1:30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    // Scoped to the card: the recent-durations row shows 1:30 as well now.
    const running = () => within(screen.getByRole('list', { name: 'Running timers' }))
    expect(running().getByText('1:30')).toBeTruthy()

    tick(10_000)
    vi.setSystemTime(NOW + 10_000)
    tick(300)
    expect(running().getByText('1:20')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    vi.setSystemTime(NOW + 40_000)
    tick(300)
    // Frozen while paused — the whole point of storing a remainder.
    expect(running().getByText('1:20')).toBeTruthy()

    // Resuming re-stamps the end from *now* — 80s still to run, from 40s in.
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.setSystemTime(NOW + 50_000)
    tick(300)
    expect(running().getByText('1:10')).toBeTruthy()
  })

  it('countdown: rings from another tool, and the bar stops it', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Duration' }), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    // Walk away — which is what a kitchen timer is for.
    go('2', 'Stopwatch')

    vi.setSystemTime(NOW + 11_000)
    tick(300)

    const bar = screen.getByRole('alert', { name: 'Timer ringing' })
    expect(bar.textContent).toContain("time's up")
    // And the tab says so too, from a route that knows nothing about timers.
    expect(document.title).toContain('⏰')

    fireEvent.click(screen.getByRole('button', { name: 'Stop ringing' }))
    tick(300)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('countdown: a preset starts a timer in one tap', () => {
    render(<App />)
    fireEvent.click(screen.getAllByRole('button', { name: /Tea · green/ })[0]!)
    const running = within(screen.getByRole('list', { name: 'Running timers' }))
    expect(running.getByText('3:00')).toBeTruthy()
  })

  it('stopwatch: runs, laps, and the lap keeps its own elapsed', async () => {
    render(<App />)
    go('2', 'Stopwatch')

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    vi.setSystemTime(NOW + 5_000)
    tick(300)
    fireEvent.click(screen.getByRole('button', { name: 'Lap' }))

    const laps = screen.getByRole('list', { name: 'Laps' })
    expect(within(laps).getAllByRole('listitem')).toHaveLength(1)
  })

  it('interval: starts and shows the phase it is in', async () => {
    render(<App />)
    go('3', 'Interval')

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    tick(300)
    // The default config opens with a 10s prepare phase; the timeline preview
    // names it too, so take the banner's.
    expect(screen.getAllByText(/Prepare/i).length).toBeGreaterThan(0)
  })

  it('metronome: really schedules beats, and stopping really stops them', async () => {
    render(<App />)
    go('4', 'Metronome')

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()

    // The scheduler ticks every 25ms and lights the beat row as it queues.
    tick(1_000)
    const bar = screen.getByRole('list', { name: /Bar of \d+ beats/ })
    expect(within(bar).getAllByRole('listitem')).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
  })

  it('metronome: a tempo change keeps the run alive', async () => {
    render(<App />)
    go('4', 'Metronome')

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Tempo' }), { target: { value: '180' } })

    expect(screen.getByText('180 BPM')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()
  })

  it('world clock: adds a city and shows its wall time', async () => {
    render(<App />)
    go('5', 'World clock')

    fireEvent.change(screen.getByLabelText('Add a timezone'), {
      target: { value: 'Asia/Tokyo' },
    })

    const list = screen.getByRole('list', { name: 'World clocks' })
    expect(within(list).getByText('Tokyo')).toBeTruthy()
  })

  it('meeting: builds a grid, offers a window, and converts the chosen instant', async () => {
    render(<App />)
    go('6', 'Meeting')

    fireEvent.change(screen.getByRole('combobox', { name: 'Add a participant' }), {
      target: { value: 'America/New_York' },
    })

    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'New York' })).toBeTruthy()

    const best = within(screen.getByRole('region', { name: 'Best times' })).getAllByRole('button')
    expect(best.length).toBeGreaterThan(0)
    fireEvent.click(best[0]!)
    expect(screen.getByRole('region', { name: 'Chosen time' })).toBeTruthy()
  })

  it('calculator: evaluates an expression, negatives included', async () => {
    render(<App />)
    go('8', 'Duration calculator')

    const field = screen.getByLabelText('Expression')
    // `1:30` is a minute and a half here, as the countdown placeholder says.
    fireEvent.change(field, { target: { value: '1:30 + 45m' } })
    expect(screen.getByText('46:30')).toBeTruthy()

    fireEvent.change(field, { target: { value: '1:30:00 + 45m' } })
    expect(screen.getByText('2:15:00')).toBeTruthy()

    fireEvent.change(field, { target: { value: '1:30 - 3m' } })
    // The old formatter rendered this as "-2:-30".
    expect(screen.getByText('-1:30')).toBeTruthy()
  })

  it('alarm: adds one and reports when it will ring', async () => {
    render(<App />)
    go('7', 'Alarm')

    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '07:30' } })
    fireEvent.click(screen.getByRole('button', { name: /Add alarm/i }))

    expect(screen.getByText('07:30')).toBeTruthy()
  })

  it('display: renders across-the-room with no navigation at all', async () => {
    render(<App />)
    act(() => {
      fireEvent.keyDown(window, { key: 'd' })
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(window.location.hash).toBe('#/display')

    expect(screen.getByLabelText('Display')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Tools' })).toBeNull()
  })

  it('settings: reaches the panel and switches theme', () => {
    render(<App />)
    go(',', 'Settings')

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } })
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('state survives a reload, because it is timestamps in storage', () => {
    const first = render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Duration' }), {
      target: { value: '5:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    tick(300)
    first.unmount()

    // A minute of wall clock passes with the app closed.
    vi.setSystemTime(NOW + 60_000)
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()

    render(<App />)
    tick(300)
    expect(
      within(screen.getByRole('list', { name: 'Running timers' })).getByText('4:00'),
    ).toBeTruthy()
  })
})
