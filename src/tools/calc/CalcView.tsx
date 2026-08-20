import { useMemo, useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { Readout } from '../../components/Readout.tsx'
import { evaluateDuration } from '../../engine/calc.ts'
import { formatClock, formatHuman } from '../../engine/duration.ts'

const EXAMPLES = ['25m + 5m', '1:30 + 45m - 20s', '1h - 20m', '1h30m - 15m']

/**
 * The duration calculator: tape-machine arithmetic on timespans. The
 * expression is the whole state — nothing is stored, nothing is needed.
 */
export function CalcView() {
  const [expression, setExpression] = useState('')
  const [copied, setCopied] = useState(false)

  const { ms, error } = useMemo(() => {
    const trimmed = expression.trim()
    if (trimmed === '') return { ms: null, error: '' }
    const value = evaluateDuration(trimmed)
    if (value === null) {
      return { ms: null, error: "Couldn't understand that — try 1:30 + 45m - 20s." }
    }
    return { ms: value, error: '' }
  }, [expression])

  const copy = (): void => {
    if (ms === null) return
    void navigator.clipboard?.writeText(formatClock(ms, { forceHours: true })).catch(() => {})
    setCopied(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--ink-2)' }}>
        Expression
        <input
          type="text"
          value={expression}
          autoComplete="off"
          spellCheck={false}
          placeholder="1:30 + 45m - 20s"
          onChange={(event) => {
            setExpression(event.target.value)
            setCopied(false)
          }}
          className="tnum rounded-xs border px-3 py-2 text-lg"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
        />
      </label>

      <output
        aria-live="polite"
        className="block min-h-6 text-sm"
        style={{ color: 'var(--accent)' }}
      >
        {error}
      </output>

      {/* Examples sit above the result so picking one never shifts the
          readout they are about to change. */}
      <div className="flex flex-wrap gap-2" aria-label="Examples">
        {EXAMPLES.map((example) => (
          <Button
            key={example}
            onClick={() => {
              setExpression(example)
              setCopied(false)
            }}
          >
            {example}
          </Button>
        ))}
      </div>

      {ms !== null && (
        <section className="flex flex-col items-center gap-2 py-4" aria-label="Result">
          <p className="text-6xl" style={{ color: 'var(--ink)' }}>
            <Readout text={formatClock(ms)} />
          </p>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {formatHuman(ms)} · {ms.toLocaleString('en-US')} ms
          </p>
          <Button onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        </section>
      )}
    </div>
  )
}
