import { useEffect, useState } from 'react'

/**
 * Hash routing, forty lines of it.
 *
 * The hash is what makes this work on GitHub Pages without a 404 fallback: the
 * server only ever serves `index.html`, and everything after the `#` never
 * leaves the browser. A router library would add a dependency for flat routes
 * that all follow the same `#/name` shape.
 *
 * The countdown is the app's home: it owns the bare `#/` (the landing hash),
 * and every unknown hash falls back to it. `#/countdown` still parses so old
 * deep links keep working.
 */
export type RouteName =
  | 'countdown'
  | 'stopwatch'
  | 'interval'
  | 'metronome'
  | 'world'
  | 'calculator'
  | 'alarm'
  | 'display'
  | 'settings'

export const ROUTES: readonly RouteName[] = [
  'countdown',
  'stopwatch',
  'interval',
  'metronome',
  'world',
  'calculator',
  'alarm',
  'display',
  'settings',
]

export const LANDING: RouteName = 'countdown'

export const routeToHash = (route: RouteName): string => (route === LANDING ? '#/' : `#/${route}`)

export function parseHash(hash: string): RouteName {
  const head = hash.replace(/^#\/?/, '').split('/')[0] ?? ''
  return (ROUTES as readonly string[]).includes(head) ? (head as RouteName) : LANDING
}

export function navigate(route: RouteName): void {
  const hash = routeToHash(route)
  if (window.location.hash !== hash) window.location.hash = hash
}

export function useRoute(): RouteName {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  return route
}
