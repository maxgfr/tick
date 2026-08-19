import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { useNow } from '../../hooks/useNow.tsx'
import { startMetronome, unlockAudio } from '../../lib/audio.ts'
import { useDispatch, useStore } from '../../store/context.ts'

/**
 * The metronome. The pulse is scheduled on the audio clock a lookahead
 * ahead of time — the DOM only animates what the scheduler already played,
 * so the visual and the click never drift apart.
 */
export function MetronomeView() {
  const { metronome } = useStore()
  const dispatch = useDispatch()
  useNow() // the shared clock keeps this view in step with the rest of the app

  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState<number | null>(null)

  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  // One scheduler per run; tempo edits restart it cleanly, and stopping or
  // unmounting always tears it down.
  const stopRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!running) return
    stopRef.current = startMetronome(metronome.bpm, metronome.beatsPerBar, (nth) => setBeat(nth))
    return () => {
      stopRef.current?.()
      stopRef.current = null
    }
  }, [running, metronome.bpm, metronome.beatsPerBar])

  const stop = (): void => {
    setRunning(false)
    setBeat(null)
  }

  const activeBeat = beat === null ? null : beat % metronome.beatsPerBar

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="flex items-end gap-3" aria-hidden="false">
        {Array.from({ length: metronome.beatsPerBar }, (_, index) => (
          <span
            key={index}
            aria-label={`Beat ${index + 1}`}
            data-active={String(index === activeBeat)}
            data-accent={String(index === 0)}
            className="h-8 w-8 rounded-full border-2 transition-transform"
            style={{
              borderColor: index === 0 ? 'var(--accent)' : 'var(--line)',
              background:
                index === activeBeat
                  ? index === 0
                    ? 'var(--accent)'
                    : 'var(--ink)'
                  : 'transparent',
              transform: index === activeBeat ? 'scale(1.25)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      <p className="tnum text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        {metronome.bpm} BPM
      </p>

      {running ? (
        <Button variant="primary" onClick={stop}>
          Stop
        </Button>
      ) : (
        <Button variant="primary" onClick={() => setRunning(true)}>
          Start
        </Button>
      )}

      <div className="flex w-full max-w-md flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
          Tempo — {metronome.bpm} BPM
          <input
            type="range"
            aria-label="Tempo"
            min={20}
            max={300}
            value={metronome.bpm}
            onChange={(event) =>
              dispatch({ type: 'metronome/set', bpm: Number.parseInt(event.target.value, 10) })
            }
          />
        </label>

        <div
          className="flex items-center justify-between gap-2 text-sm"
          style={{ color: 'var(--ink-2)' }}
        >
          Beats per bar
          <span className="flex items-center gap-2">
            <Button
              title="Fewer beats"
              disabled={metronome.beatsPerBar <= 1}
              onClick={() =>
                dispatch({ type: 'metronome/set', beatsPerBar: metronome.beatsPerBar - 1 })
              }
            >
              −
            </Button>
            <span className="tnum w-8 text-center text-base" style={{ color: 'var(--ink)' }}>
              {metronome.beatsPerBar}
            </span>
            <Button
              title="More beats"
              disabled={metronome.beatsPerBar >= 12}
              onClick={() =>
                dispatch({ type: 'metronome/set', beatsPerBar: metronome.beatsPerBar + 1 })
              }
            >
              +
            </Button>
          </span>
        </div>
      </div>
    </div>
  )
}
