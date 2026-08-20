import type { Preset } from '../../store/types.ts'
import { DurationChip } from './DurationChip.tsx'

interface PresetBarProps {
  presets: Preset[]
  onStart: (preset: Preset) => void
  onRemove: (id: string) => void
}

/**
 * The one-tap layer: the everyday timers, named. Any chip can be pruned —
 * the defaults are a starting set, not a fixed one.
 */
export function PresetBar({ presets, onStart, onRemove }: PresetBarProps) {
  if (presets.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Presets">
      {presets.map((preset) => (
        <DurationChip
          key={preset.id}
          label={preset.label}
          durationMs={preset.durationMs}
          removeLabel={`Remove ${preset.label} preset`}
          onStart={() => onStart(preset)}
          onRemove={() => onRemove(preset.id)}
        />
      ))}
    </ul>
  )
}
