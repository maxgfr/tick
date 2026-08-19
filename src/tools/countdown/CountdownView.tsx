import { useEffect, useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { parseDuration } from '../../engine/duration.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { unlockAudio } from '../../lib/audio.ts'
import { useDispatch, useStore } from '../../store/context.ts'
import { PresetBar } from './PresetBar.tsx'
import { TimerCard } from './TimerCard.tsx'

const BAD_INPUT = "Couldn't understand that duration — try 90, 1:30, or 2m30s."

/**
 * The flagship: any number of countdowns at once. Type a duration (or tap a
 * preset), get a card; every card keeps running across reloads, background
 * tabs and system sleep because none of them count — they all derive.
 */
export function CountdownView() {
  const { countdown } = useStore()
  const dispatch = useDispatch()
  const now = useNow()

  const [durationText, setDurationText] = useState('')
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

  const parse = (): number | null => {
    const ms = parseDuration(durationText.trim())
    if (ms === null || ms <= 0) {
      setError(BAD_INPUT)
      return null
    }
    setError('')
    return ms
  }

  const startTimer = (label: string, durationMs: number): void => {
    dispatch({ type: 'countdown/add', label: label.trim() || 'Timer', durationMs, now: Date.now() })
  }

  const resetInputs = (): void => {
    setDurationText('')
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
        className="flex flex-wrap items-center gap-2"
        aria-label="Start a timer"
      >
        <input
          type="text"
          name="duration"
          aria-label="Duration"
          placeholder="90 · 1:30 · 2m30s"
          autoComplete="off"
          inputMode="text"
          value={durationText}
          onChange={(event) => setDurationText(event.target.value)}
          className="tnum w-36 rounded-md border px-3 py-2 text-base"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
        />
        <input
          type="text"
          name="label"
          aria-label="Label"
          placeholder="Label (optional)"
          autoComplete="off"
          value={labelText}
          onChange={(event) => setLabelText(event.target.value)}
          className="min-w-32 flex-1 rounded-md border px-3 py-2 text-base"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
        />
        <Button type="submit" variant="primary">
          Start
        </Button>
        <Button onClick={onSavePreset} title="Save this duration as a preset and start it">
          Save preset
        </Button>
      </form>

      <output className="block min-h-5 text-sm" style={{ color: 'var(--accent)' }}>
        {error}
      </output>

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
          No timers yet — type a duration above, or tap a preset.
        </p>
      )}
    </div>
  )
}
