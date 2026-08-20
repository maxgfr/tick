import { useRoute } from './app/router.ts'
import { useThemeEffect } from './app/theme.ts'
import { TOOLS } from './app/tools.ts'
import { TickerProvider } from './hooks/useNow.tsx'
import { useStore } from './store/context.ts'
import { StoreProvider } from './store/StoreProvider.tsx'
import { AlarmWatcher } from './tools/alarm/AlarmWatcher.tsx'
import { AlarmView } from './tools/alarm/AlarmView.tsx'
import { CalcView } from './tools/calc/CalcView.tsx'
import { CountdownView } from './tools/countdown/CountdownView.tsx'
import { HomeView } from './tools/home/HomeView.tsx'
import { IntervalView } from './tools/interval/IntervalView.tsx'
import { MetronomeView } from './tools/metronome/MetronomeView.tsx'
import { StopwatchView } from './tools/stopwatch/StopwatchView.tsx'
import { WorldClockView } from './tools/world/WorldClockView.tsx'

/**
 * The shell: store and one shared clock underneath, the routed tool on top.
 * Tools read `now` from the ticker and their slice from the store — neither
 * provider changes shape as tools are added.
 */
export function App() {
  return (
    <StoreProvider>
      <TickerProvider>
        <Shell />
      </TickerProvider>
    </StoreProvider>
  )
}

function Shell() {
  const route = useRoute()
  const { settings } = useStore()
  useThemeEffect(settings.theme)

  return (
    <>
      {route !== 'home' && (
        <ToolPage
          route={route}
          content={
            route === 'countdown' ? (
              <CountdownView />
            ) : route === 'stopwatch' ? (
              <StopwatchView />
            ) : route === 'interval' ? (
              <IntervalView />
            ) : route === 'metronome' ? (
              <MetronomeView />
            ) : route === 'world' ? (
              <WorldClockView />
            ) : route === 'calculator' ? (
              <CalcView />
            ) : route === 'alarm' ? (
              <AlarmView />
            ) : (
              <Placeholder name={TOOLS.find((tool) => tool.id === route)?.name ?? ''} />
            )
          }
        />
      )}
      {(route === 'home' || !TOOLS.some((tool) => tool.id === route)) && <HomeView />}
      <AlarmWatcher />
    </>
  )
}

function ToolPage({ route, content }: { route: string; content: React.ReactNode }) {
  const tool = TOOLS.find((candidate) => candidate.id === route)
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16">
      <header className="pb-2 pt-6">
        <a href="#/" className="text-sm" style={{ color: 'var(--ink-3)' }}>
          ← tick
        </a>
        <h1 className="text-2xl font-bold">{tool?.name}</h1>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          {tool?.tagline}
        </p>
      </header>
      <section aria-label={`${tool?.name} tool`} className="py-8">
        {content}
      </section>
    </main>
  )
}

const Placeholder = ({ name }: { name: string }) => (
  <p style={{ color: 'var(--ink-3)' }}>{name} is under construction — milestone in progress.</p>
)
