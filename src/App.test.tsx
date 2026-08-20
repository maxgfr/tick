import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App.tsx'

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })
  afterEach(() => {
    window.location.hash = ''
  })

  it('lands directly on the countdown board, no hash needed', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Countdown' })).toBeTruthy()
    expect(window.location.hash).toBe('')
  })

  it('navigates to a tool on its number key', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: '2' })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/stopwatch')
    })
    expect(screen.getByRole('heading', { name: 'Stopwatch' })).toBeTruthy()
  })

  it('canonicalises the countdown route to the bare hash', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: '2' })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/stopwatch')
    })

    // Key 1 goes home — and home is the bare hash, not #/countdown.
    fireEvent.keyDown(window, { key: '1' })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/')
    })
    expect(screen.getByRole('heading', { name: 'Countdown' })).toBeTruthy()
  })

  it('marks the current tool, and mounts exactly one navigation', async () => {
    render(<App />)
    // jsdom answers `false` to every media query, so this is the phone bar.
    // Exactly one nav exists: the two are separate components, and mounting
    // both would announce every destination twice.
    expect(screen.getAllByRole('navigation', { name: 'Tools' })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Stopwatch' }).getAttribute('aria-current')).toBeNull()

    fireEvent.keyDown(window, { key: '2' })
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Stopwatch' }).getAttribute('aria-current')).toBe(
        'page',
      )
    })
  })

  it('lights the More tab when the current tool lives behind it', async () => {
    render(<App />)
    // The world clock is not a primary, so nothing in the bar would be lit —
    // the classic overflow-tab bug. The More tab takes its name instead.
    fireEvent.keyDown(window, { key: '5' })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'World clock' })).toBeTruthy()
    })
    const more = screen.getByRole('button', { name: /World/ })
    expect(more.getAttribute('aria-current')).toBe('page')
  })

  it('drops the navigation entirely on display, which is a mode not a tool', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'd' })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/display')
    })
    expect(screen.queryByRole('navigation', { name: 'Tools' })).toBeNull()
  })

  it('reaches the meeting tool on its own digit', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: '6' })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/meeting')
    })
    expect(screen.getByRole('heading', { name: 'Meeting' })).toBeTruthy()
  })

  it('opens help on ? and closes it on Escape', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).toBeNull()
  })

  it('leaves shortcut keys to a field the user is typing in', async () => {
    render(<App />)

    // The duration field on the countdown quick-add form.
    const field = await screen.findByRole('textbox', { name: 'Duration' })
    fireEvent.keyDown(field, { key: '5' })
    expect(window.location.hash).toBe('')
    expect(screen.getByRole('heading', { name: 'Countdown' })).toBeTruthy()
  })
})
