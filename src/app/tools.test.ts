import { describe, expect, it } from 'vitest'
import { ROUTES } from './router.ts'
import { CHROME, PRIMARY_TOOLS, SECONDARY_TOOLS, SECTIONS, TOOLS } from './tools.ts'

/**
 * Four surfaces read this constant — sidebar, phone bar, More sheet, help
 * overlay — plus the digit shortcuts. These are the invariants each of them
 * assumes, asserted here so "they cannot drift apart" is a fact and not a
 * hope.
 */
describe('the tool registry', () => {
  it('points only at real routes', () => {
    for (const item of [...TOOLS, ...CHROME]) {
      expect(ROUTES).toContain(item.id)
    }
  })

  it('keeps display and settings out of the tool list', () => {
    // Display presents what is already running and renders with no nav at
    // all; being a tab cost a digit and a phone slot for nothing.
    const ids = TOOLS.map((tool) => tool.id)
    expect(ids).not.toContain('display')
    expect(ids).not.toContain('settings')
    expect(CHROME.map((item) => item.id)).toEqual(['display', 'settings'])
  })

  it('numbers the tools 1..n in the order they are shown', () => {
    expect(TOOLS.map((tool) => tool.key)).toEqual(TOOLS.map((_, index) => String(index + 1)))
  })

  it('gives every destination a unique single-character key', () => {
    const keys = [...TOOLS, ...CHROME].map((item) => item.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) expect(key).toHaveLength(1)
  })

  it('marks exactly four primaries, so the phone bar fits five slots with More', () => {
    expect(PRIMARY_TOOLS).toHaveLength(4)
    expect(PRIMARY_TOOLS.length + 1).toBeLessThanOrEqual(5)
    expect(PRIMARY_TOOLS.length + SECONDARY_TOOLS.length).toBe(TOOLS.length)
  })

  it('covers every tool in exactly one section', () => {
    const sectioned = SECTIONS.flatMap((section) => section.tools.map((tool) => tool.id))
    expect(new Set(sectioned).size).toBe(TOOLS.length)
    expect([...sectioned].sort()).toEqual(TOOLS.map((tool) => tool.id).sort())
  })

  it('gives every destination one glyph and a label', () => {
    for (const item of [...TOOLS, ...CHROME]) {
      expect([...item.glyph]).toHaveLength(1)
      expect(item.nav.length).toBeGreaterThan(0)
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.tagline.length).toBeGreaterThan(0)
    }
  })
})
