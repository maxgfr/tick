import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery.ts'

/** A controllable matchMedia: one list whose `matches` we can flip. */
const stubMatchMedia = (initial: boolean) => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const list = {
    matches: initial,
    media: '',
    onchange: null,
    addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) =>
      listeners.delete(fn),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => list),
  )
  return {
    set(matches: boolean) {
      list.matches = matches
      for (const fn of listeners) fn({ matches } as MediaQueryListEvent)
    },
  }
}

const Probe = ({ query }: { query: string }) => <p>{String(useMediaQuery(query))}</p>

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the query on the first render, with no flash of the wrong layout', () => {
    stubMatchMedia(true)
    render(<Probe query="(min-width: 64rem)" />)
    expect(screen.getByText('true')).toBeTruthy()
  })

  it('follows the query when the viewport changes', () => {
    const media = stubMatchMedia(false)
    render(<Probe query="(min-width: 64rem)" />)
    expect(screen.getByText('false')).toBeTruthy()

    act(() => {
      media.set(true)
    })
    expect(screen.getByText('true')).toBeTruthy()
  })

  it('answers false where matchMedia is missing rather than throwing', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(() => render(<Probe query="(min-width: 64rem)" />)).not.toThrow()
    expect(screen.getByText('false')).toBeTruthy()
  })
})
