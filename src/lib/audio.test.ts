import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The scheduler, tested for real.
 *
 * Every other test in this repo replaces `lib/audio.ts` with `vi.mock`, which
 * is how a metronome that clicked 40 times a second at every tempo shipped
 * with a green suite: the assertions were on the arguments handed to a broken
 * function. Here nothing is mocked but the browser itself — a fake context
 * whose clock we advance by hand, recording when each oscillator was told to
 * start.
 */
class FakeContext {
  currentTime = 0
  state: AudioContextState = 'running'
  /** Absolute audio times passed to `oscillator.start()`, in order. */
  starts: number[] = []
  /** Frequency of each of those oscillators — the accent is audible here. */
  frequencies: number[] = []

  async resume(): Promise<void> {
    this.state = 'running'
  }

  // A class field, so `this` is lexical and the recorder needs no alias.
  createOscillator = (): OscillatorNode => {
    const node = {
      type: 'sine',
      frequency: { value: 0 },
      connect: () => {},
      start: (when: number) => {
        this.starts.push(when)
        this.frequencies.push(node.frequency.value)
      },
      stop: () => {},
    }
    return node as unknown as OscillatorNode
  }

  createGain = (): GainNode => {
    return {
      gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
      connect: () => {},
    } as unknown as GainNode
  }

  get destination(): AudioDestinationNode {
    return {} as AudioDestinationNode
  }
}

let audio: FakeContext

/**
 * Move both clocks together, in slices small enough for the 25 ms scheduler
 * tick to land between them — the audio clock must not teleport past a beat.
 */
const advance = (ms: number): void => {
  const STEP = 5
  for (let elapsed = 0; elapsed < ms; elapsed += STEP) {
    audio.currentTime += STEP / 1000
    vi.advanceTimersByTime(STEP)
  }
}

const load = async () => {
  vi.resetModules()
  audio = new FakeContext()
  // A constructible stub: `context()` calls `new window.AudioContext()`.
  vi.stubGlobal('AudioContext', function AudioContextStub(this: unknown) {
    return audio
  } as unknown as typeof AudioContext)
  return import('./audio.ts')
}

beforeEach(() => {
  // `performance` is not faked by default in Vitest 4, and the scheduler reads
  // `Date.now()` — fake it explicitly or the test proves nothing.
  vi.useFakeTimers({ now: 0, toFake: ['setInterval', 'clearInterval', 'Date', 'performance'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('startMetronome', () => {
  it('clicks once per beat at the requested tempo, not once per scheduler tick', async () => {
    const { startMetronome } = await load()
    const run = startMetronome({ bpm: 60, beatsPerBar: 4, startedAt: 0 })

    advance(4_000)
    run.stop()

    // 60 BPM for four seconds: beats at 0, 1, 2, 3, 4 s — the last one queued
    // a lookahead early. Not 160 clicks.
    expect(audio.starts).toEqual([0, 1, 2, 3, 4])
  })

  it('holds the tempo across the whole range', async () => {
    for (const [bpm, expected] of [
      // 20 BPM is a beat every three seconds: two of them do not fit in two.
      [20, 1],
      [120, 5],
      [300, 11],
    ] as const) {
      const { startMetronome } = await load()
      const run = startMetronome({ bpm, beatsPerBar: 4, startedAt: 0 })
      advance(2_000)
      run.stop()
      // beats in [0, 2s] inclusive of the one queued within the lookahead
      expect(audio.starts).toHaveLength(expected)
    }
  })

  it('accents the downbeat, and only the downbeat', async () => {
    const { startMetronome } = await load()
    const run = startMetronome({ bpm: 120, beatsPerBar: 3, startedAt: 0 })

    advance(3_000)
    run.stop()

    // 120 BPM in 3/4: beat 0, 3, 6 carry the accent frequency.
    const accents = audio.frequencies.map((frequency) => frequency === 1600)
    expect(accents.slice(0, 7)).toEqual([true, false, false, true, false, false, true])
  })

  it('does not drift: the thousandth beat is still on the grid', async () => {
    const { startMetronome } = await load()
    const run = startMetronome({ bpm: 600, beatsPerBar: 4, startedAt: 0 })

    advance(10_000)
    run.stop()

    // Beats are derived from an origin, never accumulated, so the last one
    // sits exactly on its multiple of the interval.
    const last = audio.starts.at(-1) ?? 0
    expect(last * 10).toBeCloseTo(Math.round(last * 10), 9)
  })

  it('re-phases on a tempo change instead of restarting the bar', async () => {
    const { startMetronome } = await load()
    const beats: number[] = []
    const run = startMetronome({
      bpm: 60,
      beatsPerBar: 4,
      startedAt: 0,
      onBeat: (beat) => beats.push(beat),
    })

    advance(2_500)
    // The store re-anchors the origin; the scheduler is told, not rebuilt.
    run.setTempo({ bpm: 120, beatsPerBar: 4, startedAt: 1_250 })
    advance(1_500)
    run.stop()

    // The beat index keeps climbing — it never falls back to 0, which is what
    // a teardown-and-rebuild would do on every slider step.
    expect(beats).toEqual([...beats].sort((a, b) => a - b))
    expect(beats[0]).toBe(0)
    expect(Math.max(...beats)).toBeGreaterThan(3)
  })

  it('survives a slider drag without machine-gunning the queue', async () => {
    const { startMetronome } = await load()
    const run = startMetronome({ bpm: 100, beatsPerBar: 4, startedAt: 0 })

    advance(1_000)
    const beforeDrag = audio.starts.length
    // Sixty change events, the way a real drag arrives.
    for (let bpm = 100; bpm < 160; bpm += 1) {
      run.setTempo({ bpm, beatsPerBar: 4, startedAt: 0 })
    }
    const afterDrag = audio.starts.length
    run.stop()

    // A drag queues nothing extra: the beats already queued stand, and no
    // click is fired at the instant of each edit.
    expect(afterDrag - beforeDrag).toBeLessThanOrEqual(1)
  })

  it('stays silent while the context is suspended, and resumes cleanly', async () => {
    const { startMetronome } = await load()
    audio.state = 'suspended'
    const run = startMetronome({ bpm: 60, beatsPerBar: 4, startedAt: 0 })

    advance(2_000)
    expect(audio.starts).toEqual([])

    // The user finally touches the page.
    audio.state = 'running'
    advance(2_000)
    run.stop()

    // It picks up at the beat the run is actually on — 2 s in at 60 BPM — and
    // does not replay the two seconds it missed.
    expect(audio.starts.length).toBeLessThanOrEqual(3)
    expect(audio.starts[0]).toBeGreaterThanOrEqual(2)
  })

  it('stops scheduling once stopped', async () => {
    const { startMetronome } = await load()
    const run = startMetronome({ bpm: 120, beatsPerBar: 4, startedAt: 0 })

    advance(1_000)
    const queued = audio.starts.length
    run.stop()
    advance(2_000)

    expect(audio.starts).toHaveLength(queued)
  })
})

describe('playSignal', () => {
  it('schedules every tone of a signal, spread by its own offsets', async () => {
    const { playSignal } = await load()
    playSignal('countdown-done')

    expect(audio.starts).toEqual([0, 0.2, 0.4])
  })

  it('is silent when sound is off', async () => {
    const { playSignal, configureAudio } = await load()
    configureAudio({ enabled: false })
    playSignal('alarm')

    expect(audio.starts).toEqual([])
  })
})
