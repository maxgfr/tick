import { formatClock } from '../../engine/duration.ts'
import type { Preset } from '../../store/types.ts'

interface PresetBarProps {
  presets: Preset[]
  onStart: (preset: Preset) => void
  onRemove: (id: string) => void
}

/**
 * The one-tap layer: presets are timers the user has started before and will
 * start again. Any chip can be pruned — defaults are a starting set, not a
 * fixed one.
 */
export function PresetBar({ presets, onStart, onRemove }: PresetBarProps) {
  if (presets.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Presets">
      {presets.map((preset) => (
        <li
          key={preset.id}
          className="flex items-center overflow-hidden rounded-xs border"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          <button
            type="button"
            className="touch-target px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--ink)' }}
            onClick={() => onStart(preset)}
          >
            {preset.label}
            <span className="tnum ml-2" style={{ color: 'var(--ink-3)' }}>
              {formatClock(preset.durationMs)}
            </span>
          </button>
          <button
            type="button"
            aria-label={`Remove ${preset.label} preset`}
            title={`Remove ${preset.label} preset`}
            className="touch-target px-2 py-1.5 text-xs transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--ink-3)' }}
            onClick={() => onRemove(preset.id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
