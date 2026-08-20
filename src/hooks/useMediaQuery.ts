import { useEffect, useState } from 'react'

/** Where the vertical rail earns its space: 13rem of nav beside 48rem of content. */
export const DESKTOP_NAV = '(min-width: 64rem)'

/**
 * A media query as React state.
 *
 * The app otherwise leaves layout to CSS, and this is the one place that
 * cannot: the desktop rail and the phone's bottom bar are structurally
 * different components, not one component restyled. Hiding one with `lg:hidden`
 * would leave both in the DOM — every destination announced twice to a screen
 * reader, and every `getByRole` in the test suite finding two matches.
 *
 * So exactly one nav is mounted. jsdom's `matchMedia` stub answers `false`,
 * which makes the phone bar the deterministic default in tests.
 */
const read = (query: string): boolean => window.matchMedia?.(query).matches ?? false

export function useMediaQuery(query: string): boolean {
  const [state, setState] = useState(() => ({ query, matches: read(query) }))

  // Adjusting during render rather than in an effect: a changed query has a
  // known answer immediately, and there is no frame of the wrong layout.
  if (state.query !== query) setState({ query, matches: read(query) })

  useEffect(() => {
    const list = window.matchMedia?.(query)
    if (list === undefined) return
    const sync = (event: MediaQueryListEvent): void => setState({ query, matches: event.matches })
    list.addEventListener('change', sync)
    return () => list.removeEventListener('change', sync)
  }, [query])

  return state.matches
}
