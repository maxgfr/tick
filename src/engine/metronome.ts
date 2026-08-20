/**
 * Metronome math.
 *
 * The run is a timestamp, not a counter: every beat index is derived from
 * `startedAt`, the same way a countdown derives its remainder from `endAt`.
 * That is what lets the pulse survive leaving the view and coming back — the
 * bar resumes where it actually is, not at one.
 *
 * The audible clicks are scheduled separately on the Web Audio clock with a
 * lookahead. Two clocks by design: the UI may stutter, the beat may not.
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
  return beatsPerBar > 0 && beat % beatsPerBar === 0
}

/**
 * How far into the run `at` is, in beats — the fractional position, so 2.5
 * means halfway between beat 2 and beat 3. Negative before the run started.
 */
export function beatPositionAt(startAtMs: number, bpm: number, at: number): number {
  return (at - startAtMs) / beatIntervalMs(bpm)
}

/** The beat sounding at `at` (0-based); the first beat lands on `startAtMs`. */
export function beatIndexAt(startAtMs: number, bpm: number, at: number): number {
  return Math.floor(beatPositionAt(startAtMs, bpm, at))
}

/**
 * A new origin for a tempo change that keeps the beat where it is.
 *
 * A tempo edit must not restart the bar: the position in beats — index and
 * fraction alike — is held constant across the change, so the next click lands
 * one new interval after the last one, and the downbeat stays the downbeat.
 */
export function reanchor(startAtMs: number, fromBpm: number, toBpm: number, at: number): number {
  const position = beatPositionAt(startAtMs, fromBpm, at)
  return at - position * beatIntervalMs(toBpm)
}
