import { useEffect, useState } from 'react'
import { navigate, useRoute } from './app/router.ts'
import { shortcutFor } from './app/shortcuts.ts'
import { useThemeEffect } from './app/theme.ts'
import { TOOLS } from './app/tools.ts'
import { HelpOverlay } from './features/help/HelpOverlay.tsx'
import { SettingsView } from './features/settings/SettingsView.tsx'
import { useAudioSettings } from './hooks/useAudioSettings.ts'
import { TickerProvider } from './hooks/useNow.tsx'
import { toggleFullscreen } from './lib/fullscreen.ts'
import { useDispatch, useStore } from './store/context.ts'
import { StoreProvider } from './store/StoreProvider.tsx'
import { AlarmWatcher } from './tools/alarm/AlarmWatcher.tsx'
import { AlarmView } from './tools/alarm/AlarmView.tsx'
import { CalcView } from './tools/calc/CalcView.tsx'
import { CountdownView } from './tools/countdown/CountdownView.tsx'
import { DisplayView } from './tools/display/DisplayView.tsx'
import { HomeView } from './tools/home/HomeView.tsx'
import { IntervalView } from './tools/interval/IntervalView.tsx'
import { MetronomeView } from './tools/metronome/MetronomeView.tsx'
import { StopwatchView } from './tools/stopwatch/StopwatchView.tsx'
import { WorldClockView } from './tools/world/WorldClockView.tsx'

/**
 * The shell: store and one shared clock underneath, the routed tool on top.
 * Tools read `now` from the ticker and their slice from the store — neither
 * provider changes shape as tools are added. Global concerns live here and
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

function Shell() {
  const route = useRoute()
  const { settings } = useStore()
  const dispatch = useDispatch()
  useThemeEffect(settings.theme)
  useAudioSettings(settings)

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
      ) : route === 'settings' ? (
        <ToolPage
          name="Settings"
          tagline="Theme, sound, notifications, and your data"
          content={<SettingsView />}
        />
      ) : route !== 'home' ? (
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
            ) : null
          }
        />
      ) : (
        <HomeView />
      )}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      <AlarmWatcher />
    </>
  )
}

function ToolPage({
  route,
  name,
  tagline,
  content,
}: {
  route?: string
  name?: string
  tagline?: string
  content: React.ReactNode
}) {
  const tool = TOOLS.find((candidate) => candidate.id === route)
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16">
      <header className="pb-2 pt-6">
        <a href="#/" className="text-sm" style={{ color: 'var(--ink-3)' }}>
          ← tick
        </a>
        <h1 className="text-2xl font-bold">{name ?? tool?.name}</h1>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          {tagline ?? tool?.tagline}
        </p>
      </header>
      <section aria-label={`${name ?? tool?.name} tool`} className="py-8">
        {content}
      </section>
    </main>
  )
}
