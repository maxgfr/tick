import { useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { downloadJson, readJsonFile } from '../../lib/io.ts'
import { requestNotificationPermission } from '../../lib/notify.ts'
import { useDispatch, useStore } from '../../store/context.ts'
import { loadState } from '../../store/persist.ts'
import type { Theme } from '../../store/types.ts'

const THEMES: readonly { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const localZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * Everything that isn’t a tool: how tick looks, how loud it is, whether it
 * may knock on the desktop, and where the data lives (here, and in a file you
 * can take with you). The whole state exports and imports as one JSON file —
 * the local-first answer to accounts and sync.
 */
export function SettingsView() {
  const state = useStore()
  const { settings } = state
  const dispatch = useDispatch()
  const [note, setNote] = useState('')

  const askNotifications = (on: boolean): void => {
    if (!on) {
      dispatch({ type: 'settings/set', patch: { notifications: false } })
      return
    }
    void requestNotificationPermission().then((permission) => {
      if (permission === 'granted') {
        dispatch({ type: 'settings/set', patch: { notifications: true } })
        setNote('Notifications are on.')
      } else {
        dispatch({ type: 'settings/set', patch: { notifications: false } })
        setNote('No notification permission — sounds and the tab title still work.')
      }
    })
  }

  const importFile = (file: File | undefined): void => {
    if (!file) return
    void readJsonFile(file)
      .then((data) => {
        // The same sanitizer the app boots through: an old or hand-edited
        // backup degrades slice by slice, never to a blank screen.
        dispatch({ type: 'state/replace', state: loadState(JSON.stringify(data), localZone()) })
        setNote('Backup imported.')
      })
      .catch(() => {
        setNote('That file is not a tick backup.')
      })
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="settings-appearance" className="flex flex-col gap-3">
        <h2
          id="settings-appearance"
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--ink-3)' }}
        >
          Appearance
        </h2>
        <label className="flex w-fit flex-col gap-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          Theme
          <select
            value={settings.theme}
            onChange={(event) => {
              const theme = THEMES.find(
                (candidate) => candidate.value === event.target.value,
              )?.value
              if (theme !== undefined) dispatch({ type: 'settings/set', patch: { theme } })
            }}
            className="rounded-md border px-3 py-2"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          >
            {THEMES.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section aria-labelledby="settings-sound" className="flex flex-col gap-3">
        <h2
          id="settings-sound"
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--ink-3)' }}
        >
          Sound
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(event) =>
              dispatch({ type: 'settings/set', patch: { sound: event.target.checked } })
            }
            className="size-4"
          />
          Sound
        </label>
        <label className="flex w-fit flex-col gap-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(event) =>
              dispatch({ type: 'settings/set', patch: { volume: Number(event.target.value) } })
            }
            className="w-48"
          />
        </label>
      </section>

      <section aria-labelledby="settings-notifications" className="flex flex-col gap-3">
        <h2
          id="settings-notifications"
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--ink-3)' }}
        >
          Notifications
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(event) => askNotifications(event.target.checked)}
            className="size-4"
          />
          Notifications
        </label>
      </section>

      <section aria-labelledby="settings-data" className="flex flex-col gap-3">
        <h2
          id="settings-data"
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--ink-3)' }}
        >
          Data — stored on this device only
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => downloadJson('tick.json', state)}>Export</Button>
          <label
            className="cursor-pointer rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--line)' }}
          >
            Import a backup file
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                importFile(event.target.files?.[0])
                event.target.value = ''
              }}
              className="sr-only"
            />
          </label>
          <Button
            variant="danger"
            ariaLabel="Clear all data"
            onClick={() => dispatch({ type: 'state/clear', localZone: localZone() })}
          >
            Clear all data
          </Button>
        </div>
      </section>

      <output
        aria-live="polite"
        className="block min-h-6 text-sm"
        style={{ color: 'var(--ink-3)' }}
      >
        {note}
      </output>
    </div>
  )
}
