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

  it('navigates to a tool on its number key', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'tick' })).toBeTruthy()

    fireEvent.keyDown(window, { key: '1' })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/countdown')
    })
    expect(screen.getByRole('heading', { name: 'Countdown' })).toBeTruthy()
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
    fireEvent.keyDown(window, { key: '1' })

    // The duration field on the countdown quick-add form.
    const field = await screen.findByRole('textbox', { name: 'Duration' })
    fireEvent.keyDown(field, { key: '5' })
    expect(window.location.hash).toBe('#/countdown')
    expect(screen.getByRole('heading', { name: 'Countdown' })).toBeTruthy()
  })
})
