import { useEffect, useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { durationFromDigits, formatClock, parseDuration } from '../../engine/duration.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { playSignal, unlockAudio } from '../../lib/audio.ts'
import { useDispatch, useStore } from '../../store/context.ts'
import { Readout } from '../../components/Readout.tsx'
import { DurationChip } from './DurationChip.tsx'
import { DurationPad } from './DurationPad.tsx'
import { PresetBar } from './PresetBar.tsx'
import { RING_INTERVAL_MS, isRinging } from './ringing.ts'
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
 *
 * When one finishes it rings the way a bedside alarm rings: over and over,
 * until it is stopped.
 */
export function CountdownView() {
  const { countdown, settings } = useStore()
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
  // The board rings, not the card: however many timers hit zero together,
  // there is one loop and one voice. And it keeps ringing — a countdown heard
  // once is a countdown missed, so it nags like an alarm clock until every
  // finished timer has been stopped (or the ring window runs out).
  const ringer = timers.find((timer) => isRinging(timer, now))
  const ringing = ringer !== undefined

  // A ringing timer holds the screen too: the alarm is only useful if the
  // thing that stops it is right there when you come back. And it takes the
  // tab title, for the times the sound is the channel that fails.
  useWakeLock(anyRunning || ringing)
  useDocumentTitle(ringer ? { timers, ringingTimer: ringer.label } : { timers }, now)

  useEffect(() => {
    if (!ringing || !settings.sound) return
    playSignal('countdown-done')
    const id = window.setInterval(() => playSignal('countdown-done'), RING_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [ringing, settings.sound])

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
    // The raw label, not the display fallback: "Timer" is what an unnamed card
    // is called, never something the user typed, and it has no business being
    // remembered as a name.
    dispatch({ type: 'countdown/add', label, durationMs, now })
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
          <Button type="submit" variant="primary" size="lg" className="w-full">
            Start
          </Button>
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
            {countdown.recents.map((recent) => (
              <DurationChip
                key={recent.durationMs}
                label={recent.label === '' ? undefined : recent.label}
                durationMs={recent.durationMs}
                removeLabel={`Forget ${recent.label === '' ? '' : `${recent.label} `}${formatClock(recent.durationMs)}`.trim()}
                // Whatever is typed wins; otherwise the chip runs under its
                // own name, which is the point of remembering it.
                onStart={() => startTimer(labelText.trim() || recent.label, recent.durationMs)}
                onRemove={() =>
                  dispatch({ type: 'countdown/recent/remove', durationMs: recent.durationMs })
                }
              />
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
