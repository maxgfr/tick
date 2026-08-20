import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button.tsx'
import { useNow } from '../../hooks/useNow.tsx'
import { audioReady, startMetronome, unlockAudio } from '../../lib/audio.ts'
import type { MetronomeRun } from '../../lib/audio.ts'
import { useDispatch, useStore } from '../../store/context.ts'

/**
 * The metronome. The pulse is scheduled on the audio clock a lookahead ahead
 * of time — the DOM only marks what the scheduler already played, so the
 * visual and the click never drift apart.
 *
 * The run lives in the store as a timestamp, and the beat index is derived
 * from it rather than counted. Leave the view and come back, or edit the
 * tempo mid-bar: the pulse resumes on the beat the run is actually on, never
 * back on one.
 */
export function MetronomeView() {
  const { metronome } = useStore()
  const dispatch = useDispatch()
  useNow() // the shared clock keeps this view in step with the rest of the app

  const [beat, setBeat] = useState<number | null>(null)
  const running = metronome.runningSince !== undefined

  // A run restored from storage starts before any gesture, so the browser
  // still has the context suspended: the pulse is silent until the user
  // touches the page. Say so, instead of showing a Stop button over silence.
  const silent = running && !audioReady()

  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  // The latest settings, readable from an effect that must not re-run on them.
  // Refreshed in its own effect, declared first so it lands before the one
  // below reads it — writing a ref during render is a different bug.
  const latest = useRef(metronome)
  useEffect(() => {
    latest.current = metronome
  })

  // One scheduler per run — created when the run starts, torn down when it
  // stops or the view unmounts. Tempo is *not* a dependency: rebuilding the
  // scheduler on every step of a slider drag is what used to restart the bar.
  const runRef = useRef<MetronomeRun | null>(null)
  useEffect(() => {
    const { bpm, beatsPerBar, runningSince } = latest.current
    if (runningSince === undefined) return
    const run = startMetronome({ bpm, beatsPerBar, startedAt: runningSince, onBeat: setBeat })
    runRef.current = run
    return () => {
      run.stop()
      runRef.current = null
      setBeat(null)
    }
  }, [running])

  // Tempo and meter are pushed into the live scheduler, which re-phases the
  // bar around the origin the reducer already moved.
  useEffect(() => {
    if (metronome.runningSince === undefined) return
    runRef.current?.setTempo({
      bpm: metronome.bpm,
      beatsPerBar: metronome.beatsPerBar,
      startedAt: metronome.runningSince,
    })
  }, [metronome.bpm, metronome.beatsPerBar, metronome.runningSince])

  const activeBeat = beat === null ? null : beat % metronome.beatsPerBar

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <ul className="flex items-end gap-2" aria-label={`Bar of ${metronome.beatsPerBar} beats`}>
        {Array.from({ length: metronome.beatsPerBar }, (_, index) => (
          // The bar is a fixed row of slots: the index is the slot.
          // oxlint-disable-next-line react/no-array-index-key
          <li
            key={index}
            aria-label={`Beat ${index + 1}`}
            aria-current={index === activeBeat ? 'true' : undefined}
            data-active={String(index === activeBeat)}
            data-accent={String(index === 0)}
            className="h-12 w-8 rounded-xs border"
            style={{
              borderColor: index === 0 ? 'var(--accent)' : 'var(--line)',
              background:
                index === activeBeat
                  ? index === 0
                    ? 'var(--accent)'
                    : 'var(--ink)'
                  : 'transparent',
            }}
          />
        ))}
      </ul>

      <p className="tnum text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        {metronome.bpm} BPM
      </p>

      {running ? (
        <Button variant="primary" onClick={() => dispatch({ type: 'metronome/stop' })}>
          Stop
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={() => dispatch({ type: 'metronome/start', now: Date.now() })}
        >
          Start
        </Button>
      )}

      <p aria-live="polite" className="text-sm" style={{ color: 'var(--ink-2)' }}>
        {silent ? 'Tap anywhere — the browser holds sound until you do.' : ''}
      </p>

      <div className="flex w-full max-w-md flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
          Tempo — {metronome.bpm} BPM
          <input
            type="range"
            aria-label="Tempo"
            min={20}
            max={300}
            value={metronome.bpm}
            style={{ accentColor: 'var(--accent)' }}
            onChange={(event) =>
              dispatch({
                type: 'metronome/set',
                bpm: Number.parseInt(event.target.value, 10),
                now: Date.now(),
              })
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
                dispatch({
                  type: 'metronome/set',
                  beatsPerBar: metronome.beatsPerBar - 1,
                  now: Date.now(),
                })
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
                dispatch({
                  type: 'metronome/set',
                  beatsPerBar: metronome.beatsPerBar + 1,
                  now: Date.now(),
                })
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
