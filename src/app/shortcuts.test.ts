import { describe, expect, it } from 'vitest'
import { TOOLS } from './tools.ts'
import { shortcutFor } from './shortcuts.ts'

/** Everything `shortcutFor` is allowed to look at — a KeyboardEvent stand-in. */
const key = (
  k: string,
  overrides?: { target?: EventTarget | null; meta?: boolean; ctrl?: boolean; alt?: boolean },
) => ({
  key: k,
  metaKey: overrides?.meta ?? false,
  ctrlKey: overrides?.ctrl ?? false,
  altKey: overrides?.alt ?? false,
  target: overrides?.target ?? null,
})

describe('shortcutFor', () => {
  it('maps keys 1–8 to the eight tools', () => {
    for (const tool of TOOLS) {
      expect(shortcutFor(key(tool.key))).toEqual({ kind: 'navigate', route: tool.id })
    }
  })

  it('maps ? to help and m/f to mute/fullscreen', () => {
    expect(shortcutFor(key('?'))).toEqual({ kind: 'help' })
    expect(shortcutFor(key('m'))).toEqual({ kind: 'mute' })
    expect(shortcutFor(key('f'))).toEqual({ kind: 'fullscreen' })
  })

  it('ignores every other key', () => {
    for (const k of ['0', '9', 'x', 'Escape', 'Enter', '/']) {
      expect(shortcutFor(key(k))).toBeNull()
    }
  })

  it('stays out of the browser’s way when a modifier is held', () => {
    for (const overrides of [{ meta: true }, { ctrl: true }, { alt: true }]) {
      expect(shortcutFor(key('1', overrides))).toBeNull()
    }
  })

  it('never fires while the user is typing', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
      const target = document.createElement(tag)
      expect(shortcutFor(key('1', { target }))).toBeNull()
    }
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    expect(shortcutFor(key('1', { target: editable }))).toBeNull()
  })
})
