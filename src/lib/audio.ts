/**
 * Web Audio: the app's entire sound budget.
 *
 * A single AudioContext, created and resumed inside the first user gesture
 * (the browser contract — iOS enforces it, everywhere else it is politeness).
 * Every tone is scheduled on the audio clock, never on a timer: the beep that
 * ends a countdown fires at `ctx.currentTime` precision even if the render
 * tick was throttled.
 */
let ctx: AudioContext | null = null
let unlocking = false

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

/** Call from any first user gesture: creates and resumes the context. */
export function unlockAudio(): void {
  if (unlocking) return
  unlocking = true
  const audio = context()
  if (audio && audio.state === 'suspended') void audio.resume()
  // Browsers can suspend the context again after a tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state === 'suspended') {
      void ctx.resume()
    }
  })
}

interface Tone {
  /** Delay from now, in milliseconds. */
  atMs: number
  frequency: number
  durationMs: number
  gain: number
}

const tone = (t: Tone): void => {
  if (!enabled || volume <= 0) return
  const audio = context()
  if (!audio || audio.state !== 'running') return

  const start = audio.currentTime + t.atMs / 1000
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
  | 'countdown-done'
  | 'phase-work'
  | 'phase-rest'
  | 'phase-end'
  | 'alarm'
  | 'beat'
  | 'beat-down'

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
  for (const t of SIGNALS[signal]) tone(t)
}

/**
 * Metronome scheduler: look ahead on the audio clock and schedule beats
 * before they are due, so the pulse is immune to render-tick jitter.
 * `onBeat` fires (slightly early, at schedule time) for the visual pulse.
 */
export function startMetronome(
  bpm: number,
  beatsPerBar: number,
  onBeat?: (beat: number, audioTime: number) => void,
): () => void {
  const audio = context()
  const intervalMs = 60_000 / bpm
  let beat = 0
  let stopped = false
  let timer = 0

  const schedule = (): void => {
    if (stopped || !audio || audio.state !== 'running') return
    const lookaheadMs = 120
    // nextDue is on the wall clock, converted to audio time at schedule time.
    let due = performance.now()
    const horizon = due + lookaheadMs
    while (due < horizon) {
      const audioTime = audio.currentTime + (due - performance.now()) / 1000
      const signal = beat % beatsPerBar === 0 ? 'beat-down' : 'beat'
      for (const t of SIGNALS[signal]) {
        tone({ ...t, atMs: Math.max(0, due - performance.now()) })
      }
      onBeat?.(beat, audioTime)
      beat += 1
      due += intervalMs
    }
  }

  schedule()
  timer = window.setInterval(schedule, Math.min(25, intervalMs))

  return () => {
    stopped = true
    window.clearInterval(timer)
  }
}
