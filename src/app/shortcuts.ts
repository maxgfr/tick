import type { RouteName } from './router.ts'
import { chromeByKey, toolByKey } from './tools.ts'

/**
 * Global keyboard shortcuts. One pure function decides what a keypress
 * means, so the answers never disagree with the ones baked into the tool
 * registry: every key here is a `key` field from that same constant.
 *
 * Shortcuts yield to the user: any modifier-held combination belongs to the
 * browser, and anything typed into a field belongs to the field.
 */
export type Shortcut =
  | { kind: 'navigate'; route: RouteName }
  | { kind: 'help' }
  | { kind: 'mute' }
  | { kind: 'fullscreen' }

interface KeyEventShape {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  target: EventTarget | null
}

export function shortcutFor(event: KeyEventShape): Shortcut | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (isTypingTarget(event.target)) return null

  // One normalisation up front: single characters are matched case-insensitively
  // (so `D` and `d` agree), named keys like 'Escape' are left alone.
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

  const tool = toolByKey(key)
  if (tool !== undefined) return { kind: 'navigate', route: tool.id }

  // Display and Settings are destinations too, just not tools.
  const chrome = chromeByKey(key)
  if (chrome !== undefined) return { kind: 'navigate', route: chrome.id }

  switch (key) {
    case '?':
      return { kind: 'help' }
    case 'm':
      return { kind: 'mute' }
    case 'f':
      return { kind: 'fullscreen' }
    default:
      return null
  }
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return (
    TYPING_TAGS.has(target.tagName) ||
    target.isContentEditable === true ||
    target.hasAttribute('contenteditable')
  )
}
