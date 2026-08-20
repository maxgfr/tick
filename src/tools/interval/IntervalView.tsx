import { useEffect, useMemo, useRef } from 'react'
import { Button } from '../../components/Button.tsx'
import { buildTimeline, phaseAt, PRESETS, totalMs } from '../../engine/intervals.ts'
import type { IntervalConfig, Phase } from '../../engine/intervals.ts'
import { formatClock } from '../../engine/duration.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useNow } from '../../hooks/useNow.tsx'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { playSignal, unlockAudio } from '../../lib/audio.ts'
import { fireNotification } from '../../lib/notify.ts'
import { useDispatch, useStore } from '../../store/context.ts'
import { IntervalConfigForm } from './IntervalConfigForm.tsx'
import { PhaseBanner } from './PhaseBanner.tsx'

const PHASE_LABEL: Record<Phase['kind'], string> = {
  prepare: 'READY',
  work: 'WORK',
  rest: 'REST',
  cooldown: 'COOL',
}

/**
 * HIIT/Tabata/EMOM. The timeline is built once from the config; where you
 * are in the workout is always a lookup on elapsed time, so beeps land on
 * phase transitions exactly once even after a throttled background tab.
 */
export function IntervalView() {
  const { interval, settings } = useStore()
  const dispatch = useDispatch()
  const now = useNow()

  const timeline = useMemo(() => buildTimeline(interval.config), [interval.config])
  const total = totalMs(timeline)

  const running = interval.startedAt !== undefined
  const active = running || interval.pausedElapsedMs !== undefined
  const elapsed =
    interval.pausedElapsedMs ?? (interval.startedAt !== undefined ? now - interval.startedAt : 0)
  const phase = active && elapsed < total ? phaseAt(timeline, elapsed) : null
  const done = active && elapsed >= total
  const phaseRemaining = phase !== null ? phase.endMs - elapsed : 0

  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useWakeLock(running)
  useDocumentTitle(
    phase && running
      ? { interval: { phase: phase.kind, remainingMs: phaseRemaining }, timers: [] }
      : { timers: [] },
    now,
  )

  // One beep per phase entry, keyed by run + phase so a restart re-beeps.
  const lastKey = useRef<string | null>(null)
  useEffect(() => {
    if (!running || !settings.sound) return
    const key = phase
      ? `${interval.startedAt}:${phase.kind}:${phase.round}`
      : done
        ? `${interval.startedAt}:done`
        : null
    if (key === null || key === lastKey.current) return
    lastKey.current = key
    if (done) playSignal('phase-end')
    else if (phase?.kind === 'work') playSignal('phase-work')
    else if (phase?.kind === 'rest' || phase?.kind === 'cooldown') playSignal('phase-rest')
  }, [running, phase, done, settings.sound, interval.startedAt])

  // The workout is over: one notification, once.
  const notifiedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!done || !settings.notifications || notifiedFor.current === `${interval.startedAt}`) return
    notifiedFor.current = `${interval.startedAt}`
    fireNotification('tick · intervals', 'Workout complete — well done.')
  }, [done, settings.notifications, interval.startedAt])

  const banner = done ? 'DONE' : phase ? PHASE_LABEL[phase.kind] : null

  return (
    <div className="flex flex-col gap-6">
      {banner !== null && (
        <PhaseBanner
          banner={banner}
          remainingMs={done ? 0 : phaseRemaining}
          round={
            phase && phase.round > 0
              ? `Round ${phase.round} of ${interval.config.rounds}`
              : undefined
          }
          elapsedMs={Math.min(elapsed, total)}
          totalMs={total}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {!active && (
          <Button
            variant="primary"
            // Every phase set to zero builds an empty timeline: starting it
            // would finish instantly and play the end signal on the spot.
            disabled={total <= 0}
            onClick={() => dispatch({ type: 'interval/start', now: Date.now() })}
          >
            Start
          </Button>
        )}
        {running && (
          <Button onClick={() => dispatch({ type: 'interval/pause', now: Date.now() })}>
            Pause
          </Button>
        )}
        {!running && active && (
          <Button
            variant="primary"
            onClick={() => dispatch({ type: 'interval/resume', now: Date.now() })}
          >
            Resume
          </Button>
        )}
        {active && <Button onClick={() => dispatch({ type: 'interval/reset' })}>Reset</Button>}
      </div>

      {!active && (
        <>
          <div className="flex flex-wrap gap-2" aria-label="Workout presets">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                onClick={() => dispatch({ type: 'interval/config', config: preset.config })}
              >
                {preset.name}
              </Button>
            ))}
          </div>

          <IntervalConfigForm
            config={interval.config}
            onChange={(config: IntervalConfig) => dispatch({ type: 'interval/config', config })}
          />
        </>
      )}

      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {interval.config.rounds} rounds · {formatClock(total)} total
        {total <= 0 && ' — give at least one phase a duration'}
      </p>
    </div>
  )
}
