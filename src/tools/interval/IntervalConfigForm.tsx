import type { IntervalConfig } from '../../engine/intervals.ts'

interface IntervalConfigFormProps {
  config: IntervalConfig
  onChange: (config: IntervalConfig) => void
}

const FIELDS: readonly { key: keyof IntervalConfig; label: string; kind: 'seconds' | 'count' }[] = [
  { key: 'prepareMs', label: 'Prepare', kind: 'seconds' },
  { key: 'workMs', label: 'Work', kind: 'seconds' },
  { key: 'restMs', label: 'Rest', kind: 'seconds' },
  { key: 'rounds', label: 'Rounds', kind: 'count' },
  { key: 'cooldownMs', label: 'Cooldown', kind: 'seconds' },
]

/**
 * Seconds in, milliseconds out. The five numbers are the entire interval
 * grammar — everything else on the screen is derived from them.
 */
export function IntervalConfigForm({ config, onChange }: IntervalConfigFormProps) {
  const update = (key: keyof IntervalConfig, kind: 'seconds' | 'count', raw: string): void => {
    const value = Number.parseInt(raw, 10)
    if (Number.isNaN(value) || value < 0) return
    if (key === 'rounds') {
      onChange({ ...config, rounds: Math.max(1, value) })
    } else if (kind === 'seconds') {
      onChange({ ...config, [key]: value * 1_000 })
    }
  }

  return (
    <fieldset
      className="flex flex-wrap gap-3 rounded-xl border p-4"
      style={{ borderColor: 'var(--line)' }}
    >
      <legend className="px-1 text-sm" style={{ color: 'var(--ink-3)' }}>
        Custom workout
      </legend>
      {FIELDS.map(({ key, label, kind }) => (
        <label key={key} className="flex flex-col gap-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          {label}
          <input
            type="number"
            min={key === 'rounds' ? 1 : 0}
            className="tnum w-20 rounded-md border px-2 py-1.5"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
            value={key === 'rounds' ? config[key] : config[key] / 1_000}
            onChange={(event) => update(key, kind, event.target.value)}
          />
        </label>
      ))}
    </fieldset>
  )
}
