import { useEffect } from 'react'
import { configureAudio } from '../lib/audio.ts'
import type { SettingsState } from '../store/types.ts'

/**
 * The bridge from persisted settings to the audio engine. Mounted once in
 * the shell, so a setting changed weeks ago still applies on the next load —
 * and a toggle applies immediately, everywhere.
 */
export function useAudioSettings(settings: SettingsState): void {
  useEffect(() => {
    configureAudio({ enabled: settings.sound, volume: settings.volume })
  }, [settings.sound, settings.volume])
}
