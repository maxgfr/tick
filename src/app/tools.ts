import type { RouteName } from './router.ts'

/**
 * The eight tools and the two chrome destinations, in one constant.
 *
 * The sidebar, the phone's bottom bar, the More sheet, the help overlay and
 * the digit shortcuts all read from here, which is what keeps them from ever
 * disagreeing. `tools.test.ts` enforces the invariants the four surfaces rely
 * on — contiguous keys, exactly four primaries, every tool in one section.
 *
 * Display is deliberately *not* a tool. It presents in fullscreen whatever is
 * already running, it renders with no navigation at all, and it was costing
 * one of eight digits and one of five phone slots to do it. It is a mode, and
 * it lives in CHROME beside Settings.
 */
export type ToolSection = 'timers' | 'clocks'

export interface Tool {
  id: RouteName
  key: string
  /** One character; the phone bar has room for nothing else. */
  glyph: string
  /** Short bar label — `name` stays the full, spoken one. */
  nav: string
  name: string
  tagline: string
  /** Gets its own slot in the phone's bottom bar; the rest live behind More. */
  primary: boolean
  section: ToolSection
}

export interface ChromeItem {
  id: RouteName
  key: string
  glyph: string
  nav: string
  name: string
  tagline: string
}

export const TOOLS: readonly Tool[] = [
  {
    id: 'countdown',
    key: '1',
    glyph: 'C',
    nav: 'Countdown',
    name: 'Countdown',
    tagline: 'Multiple timers at once, with presets for the everyday ones',
    primary: true,
    section: 'timers',
  },
  {
    id: 'stopwatch',
    key: '2',
    glyph: 'S',
    nav: 'Stopwatch',
    name: 'Stopwatch',
    tagline: 'Elapsed time and laps, precise to a tenth',
    primary: true,
    section: 'timers',
  },
  {
    id: 'interval',
    key: '3',
    glyph: 'I',
    nav: 'Interval',
    name: 'Interval',
    tagline: 'HIIT, Tabata, EMOM — prepare, work, rest, repeat',
    primary: true,
    section: 'timers',
  },
  {
    id: 'metronome',
    key: '4',
    glyph: '♩',
    nav: 'Metronome',
    name: 'Metronome',
    tagline: 'Steady beats from 20 to 300 BPM',
    primary: true,
    section: 'timers',
  },
  {
    id: 'world',
    key: '5',
    glyph: 'W',
    nav: 'World',
    name: 'World clock',
    tagline: 'Wall time in the places that matter to you',
    primary: false,
    section: 'clocks',
  },
  {
    id: 'meeting',
    key: '6',
    glyph: 'M',
    nav: 'Meeting',
    name: 'Meeting',
    tagline: 'Find an hour that works in every timezone at the table',
    primary: false,
    section: 'clocks',
  },
  {
    id: 'alarm',
    key: '7',
    glyph: 'A',
    nav: 'Alarm',
    name: 'Alarm',
    tagline: 'Wake up or step out, on selected days',
    primary: false,
    section: 'clocks',
  },
  {
    id: 'calculator',
    key: '8',
    glyph: '=',
    nav: 'Calc',
    name: 'Duration calculator',
    tagline: 'Add and subtract times and durations',
    primary: false,
    section: 'clocks',
  },
]

export const CHROME: readonly ChromeItem[] = [
  {
    id: 'display',
    key: 'd',
    glyph: '⛶',
    nav: 'Display',
    name: 'Display',
    tagline: 'Fullscreen, across the room, readable',
  },
  {
    id: 'settings',
    key: ',',
    glyph: '⚙',
    nav: 'Settings',
    name: 'Settings',
    tagline: 'Theme, sound, notifications, and your data',
  },
]

export const SECTIONS: readonly { id: ToolSection; label: string; tools: readonly Tool[] }[] = [
  { id: 'timers', label: 'Timers', tools: TOOLS.filter((tool) => tool.section === 'timers') },
  { id: 'clocks', label: 'Clocks', tools: TOOLS.filter((tool) => tool.section === 'clocks') },
]

export const PRIMARY_TOOLS: readonly Tool[] = TOOLS.filter((tool) => tool.primary)
export const SECONDARY_TOOLS: readonly Tool[] = TOOLS.filter((tool) => !tool.primary)

export const toolByKey = (key: string): Tool | undefined => TOOLS.find((tool) => tool.key === key)

export const chromeByKey = (key: string): ChromeItem | undefined =>
  CHROME.find((item) => item.key === key)

export const toolById = (id: RouteName): Tool | undefined => TOOLS.find((tool) => tool.id === id)

export const chromeById = (id: RouteName): ChromeItem | undefined =>
  CHROME.find((item) => item.id === id)

/** Tool or chrome — whatever owns this route, for a page title. */
export const destinationById = (id: RouteName): Tool | ChromeItem | undefined =>
  toolById(id) ?? chromeById(id)
