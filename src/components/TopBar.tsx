import { routeToHash } from '../app/router.ts'
import type { RouteName } from '../app/router.ts'
import { TOOLS } from '../app/tools.ts'

const linkClass = (active: boolean): string =>
  `font-display flex h-12 items-center border-b-2 px-2.5 text-sm font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${
    active
      ? 'border-[var(--accent)] text-[var(--accent)]'
      : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
  }`

/**
 * The board's header row: wordmark, the eight tools, settings — always one
 * tap away. The active link is derived from the parsed route, never the raw
 * hash, so `#/` and `#/countdown` mark the same tab.
 */
export function TopBar({ route }: { route: RouteName }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center gap-3 px-4">
        <a
          href={routeToHash('countdown')}
          className="font-display text-lg font-bold tracking-wide lowercase"
        >
          tick
        </a>
        <nav aria-label="Tools" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex items-center">
            {TOOLS.map((tool) => (
              <li key={tool.id}>
                <a
                  href={routeToHash(tool.id)}
                  aria-current={route === tool.id ? 'page' : undefined}
                  className={linkClass(route === tool.id)}
                >
                  {tool.nav}
                </a>
              </li>
            ))}
            <li>
              <a
                href={routeToHash('settings')}
                aria-current={route === 'settings' ? 'page' : undefined}
                className={linkClass(route === 'settings')}
              >
                Settings
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
