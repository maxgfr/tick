import { useEffect } from 'react'
import { TOOLS } from '../../app/tools.ts'
import { routeToHash } from '../../app/router.ts'

const GLOBAL_KEYS: readonly { key: string; does: string }[] = [
  { key: '?', does: 'Show or hide this help' },
  { key: 'M', does: 'Mute or unmute every sound' },
  { key: 'F', does: 'Toggle fullscreen' },
]

/**
 * The shortcuts cheat sheet. It answers "what was that key again" without a
 * manual: the tool rows come from the same constant that draws the home
 * grid, so the list can never drift from reality.
 */
export function HelpOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <dialog
      open
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-40 flex items-center justify-center bg-transparent p-4"
    >
      <div
        className="w-full max-w-md rounded-xl border p-6"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <div className="flex items-baseline justify-between pb-4">
          <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-sm"
            style={{ color: 'var(--ink-3)' }}
          >
            ×
          </button>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {TOOLS.map((tool) => (
              <tr key={tool.id}>
                <th
                  scope="row"
                  className="py-1 pr-4 text-left font-normal"
                  style={{ color: 'var(--ink-2)' }}
                >
                  {tool.name}
                </th>
                <td className="tnum py-1 text-right font-medium">{tool.key}</td>
              </tr>
            ))}
            {GLOBAL_KEYS.map((shortcut) => (
              <tr key={shortcut.key}>
                <th
                  scope="row"
                  className="py-1 pr-4 text-left font-normal"
                  style={{ color: 'var(--ink-2)' }}
                >
                  {shortcut.does}
                </th>
                <td className="tnum py-1 text-right font-medium">{shortcut.key}</td>
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="py-1 pr-4 text-left font-normal"
                style={{ color: 'var(--ink-2)' }}
              >
                Every tool, one tap
              </th>
              <td className="py-1 text-right">
                <a
                  href={routeToHash('home')}
                  className="underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Home
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </dialog>
  )
}
