import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import { CalcView } from './CalcView.tsx'

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

// The real clipboard API returns a promise; the component chains .catch on it.
const writeClipboard = vi.fn(() => Promise.resolve())
Object.assign(navigator, {
  clipboard: { writeText: writeClipboard },
})

describe('CalcView', () => {
  beforeEach(() => {
    localStorage.clear()
    writeClipboard.mockClear()
  })
  afterEach(() => vi.clearAllMocks())

  it('evaluates a duration expression and shows it as a clock', () => {
    render(
      <StoreProvider>
        <TickerProvider>
          <CalcView />
        </TickerProvider>
      </StoreProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Expression' }), {
      target: { value: '1:30 + 45m - 20s' },
    })

    // 90s + 45min − 20s = 46:10
    expect(screen.getByText('46:10')).toBeTruthy()
    expect(screen.getByText(/46m 10s/)).toBeTruthy()
  })

  it('copies the result to the clipboard', () => {
    render(
      <StoreProvider>
        <TickerProvider>
          <CalcView />
        </TickerProvider>
      </StoreProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Expression' }), {
      target: { value: '2h' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeClipboard).toHaveBeenCalledWith('2:00:00')
  })

  it('confirms the copy, then reverts on the next keystroke', () => {
    render(
      <StoreProvider>
        <TickerProvider>
          <CalcView />
        </TickerProvider>
      </StoreProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Expression' }), {
      target: { value: '2h' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()

    // Typing again replaces the confirmation — no timer to fight the user.
    // (Still a valid expression, so the result row stays put.)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression' }), {
      target: { value: '2h5m' },
    })
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
  })

  it('explains what it could not parse', () => {
    render(
      <StoreProvider>
        <TickerProvider>
          <CalcView />
        </TickerProvider>
      </StoreProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Expression' }), {
      target: { value: 'tomorrow' },
    })

    expect(screen.getByRole('status').textContent).toMatch(/couldn't understand/i)
  })

  it('stays quiet on an empty expression', () => {
    render(
      <StoreProvider>
        <TickerProvider>
          <CalcView />
        </TickerProvider>
      </StoreProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Expression' }), {
      target: { value: '   ' },
    })

    expect(screen.queryByRole('status')?.textContent ?? '').toBe('')
  })
})
