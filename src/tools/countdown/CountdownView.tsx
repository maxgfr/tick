import { useEffect, useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { durationFromDigits, formatClock, parseDuration } from '../../engine/duration.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { unlockAudio } from '../../lib/audio.ts'
import { useDispatch, useStore } from '../../store/context.ts'
import { Readout } from '../../components/Readout.tsx'
import { DurationPad } from './DurationPad.tsx'
import { PresetBar } from './PresetBar.tsx'
import { TimerCard } from './TimerCard.tsx'

const BAD_INPUT = "Couldn't understand that — try the keypad, or 1:30, or 2m30s."

const DIGITS = /^\d*$/
/** Leading zeros are an artefact of shifting digits in, never a value. */
const trimLeadingZeros = (digits: string): string => digits.replace(/^0+(?=\d)/, '')

/**
 * A duration from whatever the user gave us.
 *
 * Pure digits are keypad entry and shift in from the right, so `130` is a
 * minute and a half. Anything with a separator or a unit goes to the parser,
 * so `1:30` and `2m30s` keep working for whoever would rather type.
 */
const interpret = (text: string): number | null => {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const ms = DIGITS.test(trimmed) ? durationFromDigits(trimmed) : parseDuration(trimmed)
  return ms !== null && ms > 0 ? ms : null
}

/**
 * The flagship: any number of countdowns at once. Set a duration on the
 * keypad (or tap a preset, or a duration you used recently), get a card;
 * every card keeps running across reloads, background tabs and system sleep
 * because none of them count — they all derive.
 */
export function CountdownView() {
  const { countdown } = useStore()
  const dispatch = useDispatch()
  const now = useNow()

  const [entry, setEntry] = useState('')
  const [labelText, setLabelText] = useState('')
  const [error, setError] = useState('')

  // The browser contract: audio only exists after a user gesture. The first
  // tap anywhere in the tool pays that bill for every later beep.
  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const timers = countdown.timers
  const anyRunning = timers.some(
    (timer) =>
      timer.pausedRemainingMs === undefined && timer.endAt !== undefined && timer.endAt > now,
  )
  useWakeLock(anyRunning)
  useDocumentTitle({ timers }, now)

  const composed = interpret(entry)

  const parse = (): number | null => {
    if (composed === null) {
      setError(BAD_INPUT)
      return null
    }
    setError('')
    return composed
  }

  const appendDigit = (digit: string): void => {
    setError('')
    // A pad tap on top of typed text starts fresh rather than corrupting it.
    setEntry((prev) => trimLeadingZeros(((DIGITS.test(prev) ? prev : '') + digit).slice(-6)))
  }

  const backspace = (): void => {
    setError('')
    setEntry((prev) => (DIGITS.test(prev) ? prev.slice(0, -1) : ''))
  }

  const startTimer = (label: string, durationMs: number): void => {
    // Only ever called from an event handler, never during render — the timer
    // has to be stamped with the real clock, not the 250ms ticker, or it would
    // start up to a quarter second late.
    // oxlint-disable-next-line react/purity
    const now = Date.now()
    dispatch({ type: 'countdown/add', label: label.trim() || 'Timer', durationMs, now })
  }

  const resetInputs = (): void => {
    setEntry('')
    setLabelText('')
  }

  const onSubmit = (event: React.FormEvent): void => {
    event.preventDefault()
    const ms = parse()
    if (ms === null) return
    startTimer(labelText, ms)
    resetInputs()
  }

  const onSavePreset = (): void => {
    const ms = parse()
    if (ms === null) return
    const label = labelText.trim() || 'Preset'
    dispatch({ type: 'countdown/preset/add', label, durationMs: ms })
    startTimer(label, ms)
    resetInputs()
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmit}
        className="flex flex-col items-center gap-4"
        aria-label="Start a timer"
      >
        {/* What the entry means, before anything starts — which is what lets
            the keypad's shift-in convention go unexplained. */}
        <p className="text-5xl" aria-hidden="true">
          <Readout text={formatClock(composed ?? 0)} />
        </p>

        <DurationPad
          onDigit={appendDigit}
          onBackspace={backspace}
          onClear={() => {
            setError('')
            setEntry('')
          }}
          disabled={entry === ''}
        />

        <div className="flex w-full max-w-xs flex-col gap-2">
          <input
            type="text"
            name="duration"
            aria-label="Duration"
            placeholder="or type 1:30 · 2m30s"
            autoComplete="off"
            inputMode="numeric"
            value={entry}
            onChange={(event) => {
              setError('')
              setEntry(event.target.value)
            }}
            className="tnum w-full rounded-xs border px-3 py-2 text-center text-base"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          />
          <input
            type="text"
            name="label"
            aria-label="Label"
            placeholder="Label (optional)"
            autoComplete="off"
            value={labelText}
            onChange={(event) => setLabelText(event.target.value)}
            className="w-full rounded-xs border px-3 py-2 text-base"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="lg" className="flex-1">
              Start
            </Button>
            <Button
              size="lg"
              onClick={onSavePreset}
              title="Save this duration as a preset and start it"
            >
              Save preset
            </Button>
          </div>
        </div>
      </form>

      <output
        aria-live="polite"
        className="block min-h-5 text-sm"
        style={{ color: 'var(--accent)' }}
      >
        {error}
      </output>

      {countdown.recents.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Recent durations">
          <h2
            className="font-display text-xs font-semibold tracking-wide uppercase"
            style={{ color: 'var(--ink-3)' }}
          >
            Recent
          </h2>
          <ul className="flex flex-wrap gap-2">
            {countdown.recents.map((durationMs) => (
              <li key={durationMs}>
                <Button onClick={() => startTimer(labelText, durationMs)}>
                  {formatClock(durationMs)}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PresetBar
        presets={countdown.presets}
        onStart={(preset) => startTimer(preset.label, preset.durationMs)}
        onRemove={(id) => dispatch({ type: 'countdown/preset/remove', id })}
      />

      {timers.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Running timers">
          {[...timers].reverse().map((timer) => (
            <TimerCard key={timer.id} id={timer.id} />
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          No timers yet — set a duration and press Start, or tap a preset.
        </p>
      )}
    </div>
  )
}
