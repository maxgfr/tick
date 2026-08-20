import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { configureAudio } from '../lib/audio.ts'
import type { SettingsState } from '../store/types.ts'
import { useAudioSettings } from './useAudioSettings.ts'

vi.mock('../lib/audio.ts', () => ({ configureAudio: vi.fn() }))

const settings = (overrides: Partial<SettingsState>): SettingsState => ({
  theme: 'system',
  sound: true,
  volume: 0.7,
  notifications: false,
  ...overrides,
})

describe('useAudioSettings', () => {
  it('applies the persisted sound settings', () => {
    renderHook(() => useAudioSettings(settings({ sound: false, volume: 0.4 })))
    expect(configureAudio).toHaveBeenCalledWith({ enabled: false, volume: 0.4 })
  })

  it('re-applies whenever the settings change', () => {
    const hook = renderHook(({ value }) => useAudioSettings(value), {
      initialProps: { value: settings({ volume: 0.2 }) },
    })
    hook.rerender({ value: settings({ volume: 0.9 }) })
    expect(configureAudio).toHaveBeenLastCalledWith({ enabled: true, volume: 0.9 })
  })
})
