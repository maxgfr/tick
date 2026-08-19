import type { RouteName } from './router.ts'

/**
 * The eight tools, plus where they sit. One constant feeds the home grid, the
 * nav tabs and the 1–8 keyboard shortcuts, so the three can never disagree.
 */
export interface Tool {
  id: RouteName
  key: string
  name: string
  tagline: string
}

export const TOOLS: readonly Tool[] = [
  {
    id: 'countdown',
    key: '1',
    name: 'Countdown',
    tagline: 'Multiple timers at once, with presets for the everyday ones',
  },
  {
    id: 'stopwatch',
    key: '2',
    name: 'Stopwatch',
    tagline: 'Elapsed time and laps, precise to a tenth',
  },
  {
    id: 'interval',
    key: '3',
    name: 'Interval',
    tagline: 'HIIT, Tabata, EMOM — prepare, work, rest, repeat',
  },
  {
    id: 'metronome',
    key: '4',
    name: 'Metronome',
    tagline: 'Steady beats from 20 to 300 BPM',
  },
  {
    id: 'world',
    key: '5',
    name: 'World clock',
    tagline: 'Wall time in the places that matter to you',
  },
  {
    id: 'calculator',
    key: '6',
    name: 'Duration calculator',
    tagline: 'Add and subtract times and durations',
  },
  {
    id: 'alarm',
    key: '7',
    name: 'Alarm',
    tagline: 'Wake up or step out, on selected days',
  },
  {
    id: 'display',
    key: '8',
    name: 'Display',
    tagline: 'Fullscreen, across the room, readable',
  },
]

export const toolByKey = (key: string): Tool | undefined =>
  TOOLS.find((tool) => tool.key === key)
