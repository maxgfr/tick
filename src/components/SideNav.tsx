import { routeToHash } from '../app/router.ts'
import type { RouteName } from '../app/router.ts'
import { CHROME, SECTIONS } from '../app/tools.ts'

const rowClass = (active: boolean): string =>
  `font-display flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
    active
      ? 'border-[var(--accent)] text-[var(--ink)]'
      : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
  }`

const Row = ({
  route,
  active,
  glyph,
  label,
}: {
  route: RouteName
  active: boolean
  glyph: string
  label: string
}) => (
  <li>
    <a
      href={routeToHash(route)}
      aria-current={active ? 'page' : undefined}
      className={rowClass(active)}
    >
      {/* Rank is inversion: the live key is flooded, its glyph goes dark. */}
      <span aria-hidden="true" className="cell h-6 w-6 shrink-0 text-xs" data-live={String(active)}>
        {glyph}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </a>
  </li>
)

/**
 * The desktop rail: every destination visible at once, grouped, with its key
 * shown in place — the keyboard is the real navigation here, so the shortcut
 * is taught where it is used rather than hidden in an overlay.
 *
 * Mounted only above `DESKTOP_NAV`; the phone gets `MobileNav` instead, and
 * never both (see `useMediaQuery`).
 */
export function SideNav({ route }: { route: RouteName }) {
  return (
    <nav
      aria-label="Tools"
      className="fixed inset-y-0 left-0 z-20 flex w-52 flex-col gap-6 border-r py-4 pl-[env(safe-area-inset-left)]"
      style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
    >
      <a
        href={routeToHash('countdown')}
        className="font-display px-3 text-lg font-bold tracking-wide lowercase"
      >
        tick
      </a>

      {SECTIONS.map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          <p
            className="font-display px-3 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--ink-3)' }}
          >
            {section.label}
          </p>
          <ul>
            {section.tools.map((tool) => (
              <Row
                key={tool.id}
                route={tool.id}
                active={route === tool.id}
                glyph={tool.key}
                label={tool.nav}
              />
            ))}
          </ul>
        </div>
      ))}

      <div
        className="mt-auto flex flex-col gap-1 border-t pt-3"
        style={{ borderColor: 'var(--line)' }}
      >
        <ul>
          {CHROME.map((item) => (
            <Row
              key={item.id}
              route={item.id}
              active={route === item.id}
              // Tools teach their digit in the key cap; chrome shows its icon,
              // because a comma rendered at cell size is a speck.
              glyph={item.glyph}
              label={item.nav}
            />
          ))}
        </ul>
      </div>
    </nav>
  )
}
