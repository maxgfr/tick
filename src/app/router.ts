import { useEffect, useState } from 'react'

/**
 * Hash routing, forty lines of it.
 *
 * The hash is what makes this work on GitHub Pages without a 404 fallback: the
 * server only ever serves `index.html`, and everything after the `#` never
 * leaves the browser. A router library would add a dependency for flat routes
 * that all follow the same `#/name` shape.
 */
export type RouteName =
  | 'home'
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
  'home',
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

export const routeToHash = (route: RouteName): string => (route === 'home' ? '#/' : `#/${route}`)

export function parseHash(hash: string): RouteName {
  const head = hash.replace(/^#\/?/, '').split('/')[0] ?? ''
  return (ROUTES as readonly string[]).includes(head) ? (head as RouteName) : 'home'
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
