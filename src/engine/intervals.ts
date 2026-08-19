/**
 * Interval timelines.
 *
 * A HIIT/Tabata/EMOM workout is a flat list of phases with absolute
 * start/end offsets, built once from the config. Every question the UI asks
 * during a workout — which phase are we in, how long until the next one — is
 * then a lookup on elapsed time, so correctness does not depend on the app
 * being awake at each transition.
 */
export type PhaseKind = 'prepare' | 'work' | 'rest' | 'cooldown'

export interface IntervalConfig {
  prepareMs: number
  workMs: number
  restMs: number
  rounds: number
  cooldownMs: number
}

export interface Phase {
  kind: PhaseKind
  /** 1-based; 0 for prepare and cooldown, which belong to no round. */
  round: number
  startMs: number
  endMs: number
}

export interface IntervalPreset {
  id: string
  name: string
  config: IntervalConfig
}

export function buildTimeline(config: IntervalConfig): Phase[] {
  const phases: Phase[] = []
  let cursor = 0

  const push = (kind: PhaseKind, durationMs: number, round: number): void => {
    if (durationMs <= 0) return
    phases.push({ kind, round, startMs: cursor, endMs: cursor + durationMs })
    cursor += durationMs
  }

  push('prepare', config.prepareMs, 0)
  for (let round = 1; round <= config.rounds; round += 1) {
    push('work', config.workMs, round)
    // No rest after the final round — cooldown takes over, or the workout ends.
    if (round < config.rounds) push('rest', config.restMs, round)
  }
  push('cooldown', config.cooldownMs, 0)

  return phases
}

/** Half-open [start, end): the first millisecond of a phase belongs to it. */
export function phaseAt(timeline: Phase[], elapsedMs: number): Phase | null {
  for (const phase of timeline) {
    if (elapsedMs >= phase.startMs && elapsedMs < phase.endMs) return phase
  }
  return null
}

export function totalMs(timeline: Phase[]): number {
  return timeline.at(-1)?.endMs ?? 0
}

export const PRESETS: readonly IntervalPreset[] = [
  {
    id: 'tabata',
    name: 'Tabata',
    config: { prepareMs: 10_000, workMs: 20_000, restMs: 10_000, rounds: 8, cooldownMs: 0 },
  },
  {
    id: 'hiit',
    name: 'HIIT 30/30',
    config: {
      prepareMs: 10_000,
      workMs: 30_000,
      restMs: 30_000,
      rounds: 10,
      cooldownMs: 60_000,
    },
  },
  {
    id: 'emom',
    name: 'EMOM 10',
    config: {
      prepareMs: 10_000,
      workMs: 45_000,
      restMs: 15_000,
      rounds: 10,
      cooldownMs: 0,
    },
  },
]
