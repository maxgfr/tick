import { useEffect, useState } from 'react'
import { routeToHash } from '../app/router.ts'
import type { RouteName } from '../app/router.ts'
import { CHROME, PRIMARY_TOOLS, SECONDARY_TOOLS, toolById } from '../app/tools.ts'

const tabClass = (active: boolean): string =>
  `font-display flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.625rem] font-semibold uppercase tracking-wide transition-colors ${
    active ? 'text-[var(--accent)]' : 'text-[var(--ink-2)]'
  }`

/**
 * The phone's navigation: a bar at the bottom, where the thumb is.
 *
 * Five slots — four primary tools and More — because a horizontal row of nine
 * links is a scroller with no affordance, which is what this replaces. Targets
 * are 56px, and the bar pads for the home indicator: `viewport-fit=cover` was
 * already set but nothing consumed the inset, so an installed PWA put this row
 * under the iOS gesture bar.
 *
 * When the current route lives behind More, the More tab takes that tool's
 * name and its `aria-current` — otherwise the user sits on a screen whose tab
 * is not lit, which is the classic overflow-tab bug.
 */
export function MobileNav({ route }: { route: RouteName }) {
  // The sheet remembers the route it was opened from, so arriving anywhere
  // else closes it by derivation — no effect, no cascading render.
  const [openFor, setOpenFor] = useState<RouteName | null>(null)
  const open = openFor === route
  const behindMore =
    SECONDARY_TOOLS.some((tool) => tool.id === route) || CHROME.some((item) => item.id === route)
  const current = toolById(route)

  return (
    <>
      {open && <MoreSheet route={route} onClose={() => setOpenFor(null)} />}
      <nav
        aria-label="Tools"
        className="fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)]"
        style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
      >
        <ul className="flex items-stretch">
          {PRIMARY_TOOLS.map((tool) => (
            <li key={tool.id} className="flex flex-1">
              <a
                href={routeToHash(tool.id)}
                aria-current={route === tool.id ? 'page' : undefined}
                className={tabClass(route === tool.id)}
              >
                <span aria-hidden="true" className="flap h-7 w-7 text-sm">
                  {tool.glyph}
                </span>
                {tool.nav}
              </a>
            </li>
          ))}
          <li className="flex flex-1">
            <button
              type="button"
              aria-expanded={open}
              aria-current={behindMore ? 'page' : undefined}
              onClick={() => setOpenFor(open ? null : route)}
              className={tabClass(behindMore)}
            >
              <span aria-hidden="true" className="flap h-7 w-7 text-sm">
                {behindMore ? (current?.glyph ?? '⋯') : '⋯'}
              </span>
              {behindMore ? (current?.nav ?? 'More') : 'More'}
            </button>
          </li>
        </ul>
      </nav>
    </>
  )
}

function MoreSheet({ route, onClose }: { route: RouteName; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 border-0"
        style={{ background: 'color-mix(in srgb, var(--bg) 80%, transparent)' }}
      />
      <dialog
        open
        aria-label="More tools"
        className="w-full border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <ul className="grid grid-cols-2 gap-2">
          {[...SECONDARY_TOOLS, ...CHROME].map((item) => (
            <li key={item.id}>
              <a
                href={routeToHash(item.id)}
                aria-current={route === item.id ? 'page' : undefined}
                onClick={onClose}
                className={`font-display flex min-h-14 items-center gap-3 rounded-xs border px-3 text-sm font-semibold uppercase tracking-wide ${
                  route === item.id ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
                }`}
                style={{ borderColor: route === item.id ? 'var(--accent)' : 'var(--line)' }}
              >
                <span aria-hidden="true" className="flap h-7 w-7 shrink-0 text-sm">
                  {item.glyph}
                </span>
                <span className="min-w-0 truncate">{item.nav}</span>
              </a>
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  )
}
