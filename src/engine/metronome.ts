/**
 * Metronome math.
 *
 * The display follows these pure functions; the audible clicks are scheduled
 * separately on the Web Audio clock with a lookahead. Two clocks by design:
 * the UI may stutter, the beat may not.
 */
export function beatIntervalMs(bpm: number): number {
  return 60_000 / bpm
}

/** Timestamp of beat `n` (0-based) when the metronome started at `startAtMs`. */
export function nthBeatTime(startAtMs: number, bpm: number, n: number): number {
  return startAtMs + n * beatIntervalMs(bpm)
}

/** Beat 0 of every bar, counting beats from zero. */
export function isDownbeat(beat: number, beatsPerBar: number): boolean {
  return beat % beatsPerBar === 0
}
