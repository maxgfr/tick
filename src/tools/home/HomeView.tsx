import { TOOLS } from '../../app/tools.ts'

/**
 * First viewport: the tool grid. Whatever is running shows live on the cards
 * once the runtime exists; for now the grid is the whole promise of the app —
 * every timer you reach for, one tap away.
 */
export function HomeView() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16">
      <header className="pt-10 pb-6">
        <h1 className="text-4xl font-bold tracking-tight">tick</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          Timers for the everyday: countdowns, intervals, beats and clocks. Everything runs on your
          device — no account, no server, no tracking.
        </p>
      </header>

      <nav aria-label="Tools">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.id}>
              <a
                href={`#/${tool.id}`}
                className="block h-full rounded-lg border p-4 transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
              >
                <span className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold">{tool.name}</span>
                  <span
                    className="tnum text-xs"
                    style={{ color: 'var(--ink-3)' }}
                    aria-hidden="true"
                  >
                    {tool.key}
                  </span>
                </span>
                <span className="mt-1 block text-sm" style={{ color: 'var(--ink-2)' }}>
                  {tool.tagline}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="pt-10 text-xs" style={{ color: 'var(--ink-3)' }}>
        <a href="#/settings">Settings</a>
      </footer>
    </main>
  )
}
