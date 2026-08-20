/**
 * Web Audio: the app's entire sound budget.
 *
 * A single AudioContext, created and resumed inside the first user gesture
 * (the browser contract — iOS enforces it, everywhere else it is politeness).
 * Every tone is scheduled on the audio clock, never on a timer: the beep that
 * ends a countdown fires at `ctx.currentTime` precision even if the render
 * tick was throttled.
 */
import { beatIntervalMs, isDownbeat } from '../engine/metronome.ts'

let ctx: AudioContext | null = null
let visibilityBound = false

let enabled = true
let volume = 0.7

export function configureAudio(options: { enabled?: boolean; volume?: number }): void {
  if (options.enabled !== undefined) enabled = options.enabled
  if (options.volume !== undefined) volume = Math.min(1, Math.max(0, options.volume))
}

const context = (): AudioContext | null => {
  if (ctx === null) {
    if (typeof window.AudioContext !== 'function') return null
    ctx = new window.AudioContext()
  }
  return ctx
}

/**
 * Call from any first user gesture: creates and resumes the context.
 *
 * Every gesture retries. Latching after one attempt would strand the app
 * silent for the rest of the session whenever the first `resume()` is
 * rejected — Safari is particular about which gesture the call is nested in.
 */
export function unlockAudio(): void {
  const audio = context()
  if (audio && audio.state === 'suspended') void audio.resume()

  // Browsers can suspend the context again after a tab is hidden.
  if (visibilityBound) return
  visibilityBound = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state === 'suspended') {
      void ctx.resume()
    }
  })
}

/** True once the context exists and is actually running. */
export function audioReady(): boolean {
  return ctx !== null && ctx.state === 'running'
}

interface Tone {
  /** Delay from the signal's own start, in milliseconds. */
  atMs: number
  frequency: number
  durationMs: number
  gain: number
}

/** Schedules one tone at an absolute time on the audio clock. */
const toneAt = (audio: AudioContext, t: Omit<Tone, 'atMs'>, start: number): void => {
  if (!enabled || volume <= 0) return

  const oscillator = audio.createOscillator()
  const amplifier = audio.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = t.frequency

  // Short attack and release so the tone speaks without a click.
  const peak = t.gain * volume
  amplifier.gain.setValueAtTime(0, start)
  amplifier.gain.linearRampToValueAtTime(peak, start + 0.005)
  amplifier.gain.setValueAtTime(peak, start + t.durationMs / 1000 - 0.02)
  amplifier.gain.linearRampToValueAtTime(0, start + t.durationMs / 1000)

  oscillator.connect(amplifier)
  amplifier.connect(audio.destination)
  oscillator.start(start)
  oscillator.stop(start + t.durationMs / 1000 + 0.02)
}

export type Signal =
  'countdown-done' | 'phase-work' | 'phase-rest' | 'phase-end' | 'alarm' | 'beat' | 'beat-down'

const SIGNALS: Record<Signal, readonly Tone[]> = {
  // A rising triad — the oven-timer "it is ready".
  'countdown-done': [
    { atMs: 0, frequency: 880, durationMs: 180, gain: 0.5 },
    { atMs: 200, frequency: 1175, durationMs: 180, gain: 0.5 },
    { atMs: 400, frequency: 1568, durationMs: 320, gain: 0.5 },
  ],
  'phase-work': [
    { atMs: 0, frequency: 988, durationMs: 120, gain: 0.45 },
    { atMs: 150, frequency: 988, durationMs: 120, gain: 0.45 },
  ],
  'phase-rest': [{ atMs: 0, frequency: 523, durationMs: 200, gain: 0.4 }],
  'phase-end': [
    { atMs: 0, frequency: 784, durationMs: 160, gain: 0.45 },
    { atMs: 200, frequency: 523, durationMs: 300, gain: 0.45 },
  ],
  alarm: [
    { atMs: 0, frequency: 1047, durationMs: 140, gain: 0.55 },
    { atMs: 180, frequency: 1319, durationMs: 140, gain: 0.55 },
    { atMs: 360, frequency: 1047, durationMs: 140, gain: 0.55 },
    { atMs: 540, frequency: 1319, durationMs: 140, gain: 0.55 },
  ],
  beat: [{ atMs: 0, frequency: 1000, durationMs: 40, gain: 0.35 }],
  'beat-down': [{ atMs: 0, frequency: 1600, durationMs: 55, gain: 0.5 }],
}

export function playSignal(signal: Signal): void {
  const audio = context()
  if (!audio || audio.state !== 'running') return
  for (const t of SIGNALS[signal]) toneAt(audio, t, audio.currentTime + t.atMs / 1000)
}

export interface MetronomeRun {
  /** Tempo or meter changed. The bar is re-phased, never restarted. */
  setTempo(options: { bpm: number; beatsPerBar: number; startedAt: number }): void
  stop(): void
}

/** How far ahead of the audio clock beats are queued, in seconds. */
const LOOKAHEAD_S = 0.12
/** How often the queue is topped up. Independent of tempo, by design. */
const TICK_MS = 25

/**
 * Metronome scheduler: queue beats on the audio clock ahead of time, so the
 * pulse is immune to render-tick jitter.
 *
 * The beat index is *derived* from `startedAt`, never counted: the origin is
 * anchored once against the audio clock, and every beat's time is a function
 * of it. That is what makes a tempo change re-phase instead of restarting the
 * bar, and what lets a run picked up from storage resume on the right beat.
 *
 * `onBeat` fires at schedule time — a lookahead early — for the visual pulse.
 */
export function startMetronome(options: {
  bpm: number
  beatsPerBar: number
  /** Wall-clock ms the run began at; the beat phase is derived from it. */
  startedAt: number
  onBeat?: (beat: number) => void
}): MetronomeRun {
  const audio = context()
  const onBeat = options.onBeat
  let { bpm, beatsPerBar, startedAt } = options
  let stopped = false

  /** Audio-clock time of beat 0. The one place the two clocks meet. */
  let origin = 0
  /** The first beat not yet queued. Lives here, not inside `schedule`. */
  let nextBeat = 0
  /** Audio time of the last beat handed to the context. Already committed. */
  let queuedThrough = Number.NEGATIVE_INFINITY

  const intervalS = (): number => beatIntervalMs(bpm) / 1000
  const beatTime = (beat: number): number => origin + beat * intervalS()

  /**
   * Re-derive the origin from `startedAt`, then pick up after whatever is
   * already queued. A tone handed to the audio clock cannot be recalled, so a
   * tempo change must resume past it — re-queueing the lookahead window on
   * every slider step is what turns a drag into a flam.
   */
  const anchor = (): void => {
    if (!audio) return
    origin = audio.currentTime - (Date.now() - startedAt) / 1000
    const fromClock = Math.ceil((audio.currentTime - origin) / intervalS())
    const fromQueue =
      queuedThrough === Number.NEGATIVE_INFINITY
        ? 0
        : Math.floor((queuedThrough - origin) / intervalS() + 1e-9) + 1
    nextBeat = Math.max(0, fromClock, fromQueue)
  }

  const schedule = (): void => {
    if (stopped || !audio || audio.state !== 'running') return

    // A throttled or suspended tab leaves the queue far behind. Skip to the
    // present instead of firing a burst of late clicks.
    const earliest = Math.ceil((audio.currentTime - origin) / intervalS())
    if (nextBeat < earliest) nextBeat = earliest

    const horizon = audio.currentTime + LOOKAHEAD_S
    while (beatTime(nextBeat) < horizon) {
      const signal = isDownbeat(nextBeat, beatsPerBar) ? 'beat-down' : 'beat'
      const at = beatTime(nextBeat)
      for (const t of SIGNALS[signal]) toneAt(audio, t, at + t.atMs / 1000)
      onBeat?.(nextBeat)
      queuedThrough = at
      nextBeat += 1
    }
  }

  anchor()
  schedule()
  const timer = window.setInterval(schedule, TICK_MS)

  return {
    setTempo(next) {
      bpm = next.bpm
      beatsPerBar = next.beatsPerBar
      startedAt = next.startedAt
      // Re-anchor against the new origin the store already re-phased, and
      // top the queue up now so the change is heard on the next beat.
      anchor()
      schedule()
    },
    stop() {
      stopped = true
      window.clearInterval(timer)
    },
  }
}
