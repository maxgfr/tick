import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { TickerProvider } from '../../hooks/useNow.tsx'
import { downloadJson, readJsonFile } from '../../lib/io.ts'
import { requestNotificationPermission } from '../../lib/notify.ts'
import { STORAGE_KEY, serialize } from '../../store/persist.ts'
import { defaultState } from '../../store/reducer.ts'
import { StoreProvider } from '../../store/StoreProvider.tsx'
import { useStore } from '../../store/context.ts'
import type { AppState } from '../../store/types.ts'
import { SettingsView } from './SettingsView.tsx'

vi.mock('../../lib/io.ts', () => ({
  downloadJson: vi.fn(),
  readJsonFile: vi.fn(),
}))
vi.mock('../../lib/notify.ts', () => ({
  fireNotification: vi.fn(),
  notificationsSupported: () => true,
  notificationPermission: () => 'default' as const,
  requestNotificationPermission: vi.fn(),
}))

/** Mirrors the store so dispatches can be asserted without touching storage. */
const probe: { state: AppState | undefined } = { state: undefined }
const Probe = (): null => {
  const state = useStore()
  useEffect(() => {
    probe.state = state
  })
  return null
}
const seen = (): AppState => probe.state!

const mount = () =>
  render(
    <StoreProvider>
      <TickerProvider>
        <SettingsView />
        <Probe />
      </TickerProvider>
    </StoreProvider>,
  )

describe('SettingsView', () => {
  beforeEach(() => {
    localStorage.clear()
    probe.state = undefined
  })
  afterEach(() => vi.clearAllMocks())

  it('changes the theme', () => {
    mount()
    fireEvent.change(screen.getByRole('combobox', { name: 'Theme' }), {
      target: { value: 'dark' },
    })
    expect(seen().settings.theme).toBe('dark')
  })

  it('toggles sound and sets the volume', () => {
    mount()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sound' }))
    expect(seen().settings.sound).toBe(false)

    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), {
      target: { value: '0.25' },
    })
    expect(seen().settings.volume).toBe(0.25)
  })

  it('turns notifications on only when permission is granted', async () => {
    vi.mocked(requestNotificationPermission).mockResolvedValue('denied')
    mount()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Notifications' }))
    await waitFor(() => {
      expect(screen.getByText(/no notification permission/i)).toBeTruthy()
    })
    expect(seen().settings.notifications).toBe(false)

    vi.mocked(requestNotificationPermission).mockResolvedValue('granted')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Notifications' }))
    await waitFor(() => {
      expect(seen().settings.notifications).toBe(true)
    })
  })

  it('exports the whole state as JSON', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    expect(downloadJson).toHaveBeenCalledWith('tick.json', seen())
  })

  it('imports a state file, sanitized through loadState', async () => {
    const before = defaultState('UTC')
    localStorage.setItem(STORAGE_KEY, serialize(before))
    const imported = defaultState('UTC')
    imported.world.zoneIds = ['Asia/Tokyo']
    vi.mocked(readJsonFile).mockResolvedValue(JSON.parse(JSON.stringify(imported)))

    mount()
    fireEvent.change(screen.getByLabelText(/import/i), {
      target: { files: [new File(['{}'], 'tick.json', { type: 'application/json' })] },
    })

    await waitFor(() => {
      expect(seen().world.zoneIds).toEqual(['Asia/Tokyo'])
    })
  })

  it('clears everything back to defaults, but only after an explicit confirm', () => {
    const withTimer = defaultState('UTC')
    withTimer.countdown.timers = [
      { id: 't1', label: 'Tea', totalMs: 60_000, endAt: Date.now() + 60_000 },
    ]
    localStorage.setItem(STORAGE_KEY, serialize(withTimer))
    mount()

    // The first tap only asks — the data is still there.
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(seen().countdown.timers).toHaveLength(1)

    // Backing out keeps everything.
    fireEvent.click(screen.getByRole('button', { name: /keep my data/i }))
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(seen().countdown.timers).toHaveLength(1)

    // Confirming wipes to defaults.
    fireEvent.click(screen.getByRole('button', { name: /yes, clear everything/i }))
    expect(seen().countdown.timers).toHaveLength(0)
    expect(seen().countdown.presets).toHaveLength(defaultState('UTC').countdown.presets.length)
  })
})
