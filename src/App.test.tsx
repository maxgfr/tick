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

  it('marks the current tool in the bar, which disappears on display', async () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'Tools' })
    expect(nav).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Stopwatch' }).getAttribute('aria-current')).toBeNull()

    fireEvent.keyDown(window, { key: '2' })
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Stopwatch' }).getAttribute('aria-current')).toBe(
        'page',
      )
    })

    fireEvent.keyDown(window, { key: '8' })
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'Tools' })).toBeNull()
    })
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
