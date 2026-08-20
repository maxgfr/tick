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
  | 'meeting'
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
  'meeting',
  'calculator',
  'alarm',
  'display',
  'settings',
]

export const LANDING: RouteName = 'countdown'

export const routeToHash = (route: RouteName, param?: string): string => {
  const base = route === LANDING ? '#/' : `#/${route}`
  if (param === undefined || param === '') return base
  return route === LANDING ? `#/${LANDING}/${param}` : `${base}/${param}`
}

/**
 * Everything after the route segment. The meeting tool carries a shared
 * roster this way — in the fragment, which browsers never put on the wire, so
 * a share link costs no network and passes the privacy gate untouched.
 */
export function parseParam(hash: string): string {
  return hash.replace(/^#\/?/, '').split('/').slice(1).join('/')
}

export function parseHash(hash: string): RouteName {
  const head = hash.replace(/^#\/?/, '').split('/')[0] ?? ''
  return (ROUTES as readonly string[]).includes(head) ? (head as RouteName) : LANDING
}

export function navigate(route: RouteName, param?: string): void {
  const hash = routeToHash(route, param)
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

/** The route's payload segment, tracked like the route itself. */
export function useHashParam(): string {
  const [param, setParam] = useState(() => parseParam(window.location.hash))

  useEffect(() => {
    const sync = () => setParam(parseParam(window.location.hash))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  return param
}
