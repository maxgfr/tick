import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { STORAGE_KEY } from '../store/persist.ts'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * The last line of defence, wrapped around the whole app.
 *
 * Without one, a single `TypeError` in any view is the entire application
 * gone white — and because the state that caused it is already in
 * localStorage, the reload does it again. The user's only remaining move is
 * to clear the site's storage by hand, through browser settings they should
 * never have to find.
 *
 * So the escape hatch is the point of this screen, not the apology: reload
 * first, and if that fails, discard the saved state from here.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Nothing leaves the device — there is no reporting endpoint and the CSP
    // would block one. The console is the whole audience.
    console.error('tick crashed:', error, info.componentStack)
  }

  private readonly reload = (): void => {
    window.location.reload()
  }

  private readonly clearData = (): void => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Private mode, or storage disabled: the reload is still worth trying.
    }
    window.location.hash = ''
    window.location.reload()
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children

    return (
      <main
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-6"
        style={{ background: 'var(--bg)', color: 'var(--ink)' }}
      >
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
          tick stopped here
        </h1>
        <p style={{ color: 'var(--ink-2)' }}>
          Something in the app threw and the screen could not be drawn. Your timers are still saved
          — reloading usually brings them back.
        </p>
        <p className="tnum text-sm" style={{ color: 'var(--ink-3)' }}>
          {error.message}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={this.reload}
            className="font-display rounded-xs px-5 py-2.5 text-base font-semibold uppercase tracking-wide"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            Reload
          </button>
          <button
            type="button"
            onClick={this.clearData}
            className="font-display rounded-xs border px-5 py-2.5 text-base font-semibold uppercase tracking-wide"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
          >
            Discard saved data
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Discarding removes every timer, preset, alarm and setting stored on this device. It is the
          way out if reloading lands here again.
        </p>
      </main>
    )
  }
}
