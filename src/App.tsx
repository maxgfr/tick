import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { navigate, useRoute } from './app/router.ts'
import type { RouteName } from './app/router.ts'
import { shortcutFor } from './app/shortcuts.ts'
import { useThemeEffect } from './app/theme.ts'
import { destinationById } from './app/tools.ts'
import { HelpOverlay } from './features/help/HelpOverlay.tsx'
import { SettingsView } from './features/settings/SettingsView.tsx'
import { useAudioSettings } from './hooks/useAudioSettings.ts'
import { DESKTOP_NAV, useMediaQuery } from './hooks/useMediaQuery.ts'
import { TickerProvider } from './hooks/useNow.tsx'
import { toggleFullscreen } from './lib/fullscreen.ts'
import { useDispatch, useStore } from './store/context.ts'
import { StoreProvider } from './store/StoreProvider.tsx'
import { MobileNav } from './components/MobileNav.tsx'
import { SideNav } from './components/SideNav.tsx'
import { AlarmWatcher } from './tools/alarm/AlarmWatcher.tsx'
import { AlarmView } from './tools/alarm/AlarmView.tsx'
import { CalcView } from './tools/calc/CalcView.tsx'
import { CountdownView } from './tools/countdown/CountdownView.tsx'
import { DisplayView } from './tools/display/DisplayView.tsx'
import { IntervalView } from './tools/interval/IntervalView.tsx'
import { MeetingView } from './tools/meeting/MeetingView.tsx'
import { MetronomeView } from './tools/metronome/MetronomeView.tsx'
import { StopwatchView } from './tools/stopwatch/StopwatchView.tsx'
import { WorldClockView } from './tools/world/WorldClockView.tsx'

/**
 * The shell: store and one shared clock underneath, the routed tool on top.
 * The countdown is the landing screen — the app opens on its main board — and
 * every other tool hangs off the navigation. Global concerns live here and
 * only here: theme, sound settings, keyboard shortcuts, the alarm watcher.
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

/** One entry per route. A map, so adding a tool is one line, not one branch. */
const VIEWS: Record<Exclude<RouteName, 'display'>, () => ReactNode> = {
  countdown: () => <CountdownView />,
  stopwatch: () => <StopwatchView />,
  interval: () => <IntervalView />,
  metronome: () => <MetronomeView />,
  world: () => <WorldClockView />,
  meeting: () => <MeetingView />,
  calculator: () => <CalcView />,
  alarm: () => <AlarmView />,
  settings: () => <SettingsView />,
}

function Shell() {
  const route = useRoute()
  const { settings } = useStore()
  const dispatch = useDispatch()
  useThemeEffect(settings.theme)
  useAudioSettings(settings)

  // Exactly one navigation is mounted — see `useMediaQuery` for why CSS alone
  // will not do here.
  const desktop = useMediaQuery(DESKTOP_NAV)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const shortcut = shortcutFor(event)
      if (shortcut === null) return
      switch (shortcut.kind) {
        case 'navigate':
          navigate(shortcut.route)
          break
        case 'help':
          setHelpOpen((open) => !open)
          break
        case 'mute':
          dispatch({ type: 'settings/set', patch: { sound: !settings.sound } })
          break
        case 'fullscreen':
          toggleFullscreen()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settings.sound, dispatch])

  return (
    <>
      {route === 'display' ? (
        <DisplayView />
      ) : (
        <>
          {desktop ? <SideNav route={route} /> : <MobileNav route={route} />}
          <ToolPage route={route} desktop={desktop} />
        </>
      )}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      <AlarmWatcher />
    </>
  )
}

function ToolPage({ route, desktop }: { route: RouteName; desktop: boolean }) {
  const destination = destinationById(route)
  const view = route === 'display' ? null : VIEWS[route]()

  return (
    <main
      className={
        desktop
          ? 'ml-52 min-h-dvh w-full max-w-3xl px-6 pb-16'
          : 'mx-auto min-h-dvh w-full max-w-3xl px-4 pt-[env(safe-area-inset-top)] pb-[calc(5rem+env(safe-area-inset-bottom))]'
      }
    >
      <header className="pt-6 pb-2">
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
          {destination?.name}
        </h1>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          {destination?.tagline}
        </p>
      </header>
      <section aria-label={`${destination?.name ?? 'Tool'} tool`} className="py-8">
        {view}
      </section>
    </main>
  )
}
