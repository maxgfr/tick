import type { RouteName } from './router.ts'

/**
 * The eight tools, plus where they sit. One constant feeds the top bar, the
 * help overlay and the 1–8 keyboard shortcuts, so the three can never
 * disagree.
 */
export interface Tool {
  id: RouteName
  key: string
  /** Short bar label — `name` stays the full, spoken one. */
  nav: string
  name: string
  tagline: string
}

export const TOOLS: readonly Tool[] = [
  {
    id: 'countdown',
    key: '1',
    nav: 'Countdown',
    name: 'Countdown',
    tagline: 'Multiple timers at once, with presets for the everyday ones',
  },
  {
    id: 'stopwatch',
    key: '2',
    nav: 'Stopwatch',
    name: 'Stopwatch',
    tagline: 'Elapsed time and laps, precise to a tenth',
  },
  {
    id: 'interval',
    key: '3',
    nav: 'Interval',
    name: 'Interval',
    tagline: 'HIIT, Tabata, EMOM — prepare, work, rest, repeat',
  },
  {
    id: 'metronome',
    key: '4',
    nav: 'Metronome',
    name: 'Metronome',
    tagline: 'Steady beats from 20 to 300 BPM',
  },
  {
    id: 'world',
    key: '5',
    nav: 'World',
    name: 'World clock',
    tagline: 'Wall time in the places that matter to you',
  },
  {
    id: 'calculator',
    key: '6',
    nav: 'Calc',
    name: 'Duration calculator',
    tagline: 'Add and subtract times and durations',
  },
  {
    id: 'alarm',
    key: '7',
    nav: 'Alarm',
    name: 'Alarm',
    tagline: 'Wake up or step out, on selected days',
  },
  {
    id: 'display',
    key: '8',
    nav: 'Display',
    name: 'Display',
    tagline: 'Fullscreen, across the room, readable',
  },
]

export const toolByKey = (key: string): Tool | undefined => TOOLS.find((tool) => tool.key === key)
