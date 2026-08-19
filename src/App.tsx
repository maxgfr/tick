import { useRoute } from './app/router.ts'
import { TOOLS } from './app/tools.ts'
import { HomeView } from './tools/home/HomeView.tsx'

/**
 * The shell: nav across the top, the routed tool underneath. Providers slot in
 * between the shell and the tools as the runtime grows (store, ticker) — the
 * layout does not change shape when they do.
 */
export function App() {
  const route = useRoute()

  if (route === 'home') return <HomeView />

  const tool = TOOLS.find((candidate) => candidate.id === route)
  if (tool) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16">
        <header className="pt-6 pb-2">
          <a href="#/" className="text-sm" style={{ color: 'var(--ink-3)' }}>
            ← tick
          </a>
          <h1 className="text-2xl font-bold">{tool.name}</h1>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {tool.tagline}
          </p>
        </header>
        <section aria-label={`${tool.name} tool`} className="py-8">
          <p style={{ color: 'var(--ink-3)' }}>Under construction — milestone in progress.</p>
        </section>
      </main>
    )
  }

  return <HomeView />
}
