import { useEffect } from 'react'
import { TOOLS } from '../../app/tools.ts'

const GLOBAL_KEYS: readonly { key: string; does: string }[] = [
  { key: '?', does: 'Show or hide this help' },
  { key: 'M', does: 'Mute or unmute every sound' },
  { key: 'F', does: 'Toggle fullscreen' },
]

/**
 * The shortcuts cheat sheet. It answers "what was that key again" without a
 * manual: the tool rows come from the same constant that draws the top bar,
 * so the list can never drift from reality. Escape closes it, and so does a
 * click on the scrim.
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
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,14,12,0.6)' }}
    >
      {/* The scrim, as a real button: a click outside the card closes. */}
      <button
        type="button"
        aria-label="Close help"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        style={{ background: 'transparent' }}
      />
      <div
        className="relative w-full max-w-md rounded-xs border p-6"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <div className="flex items-baseline justify-between pb-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-display text-lg font-semibold"
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
                <td className="tnum py-1 text-right font-semibold">{tool.key}</td>
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
                <td className="tnum py-1 text-right font-semibold">{shortcut.key}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </dialog>
  )
}
