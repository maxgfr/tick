import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { STORAGE_KEY } from '../store/persist.ts'

const Boom = (): never => {
  throw new Error('timers.some is not a function')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error; the boundary logs it too. Neither is news.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>the app</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('the app')).toBeTruthy()
  })

  it('shows the failure and what actually went wrong', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: 'tick stopped here' })).toBeTruthy()
    expect(screen.getByText('timers.some is not a function')).toBeTruthy()
  })

  it('offers a way out of state that crashes on every reload', () => {
    // This is the whole point: a bad slice in localStorage used to mean the
    // white screen came back on every reload, with no in-app escape.
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload, hash: '#/display', href: 'http://localhost/' },
    })
    localStorage.setItem(STORAGE_KEY, '{"countdown":{}}')

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Discard saved data' }))

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(reload).toHaveBeenCalled()
  })
})
