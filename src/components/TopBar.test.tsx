import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TopBar } from './TopBar.tsx'

describe('TopBar', () => {
  it('shows the wordmark, a link per tool, and settings', () => {
    render(<TopBar route="countdown" />)
    expect(screen.getByRole('link', { name: 'tick' })).toBeTruthy()

    const nav = screen.getByRole('navigation', { name: 'Tools' })
    expect(nav).toBeTruthy()
    for (const label of [
      'Countdown',
      'Stopwatch',
      'Interval',
      'Metronome',
      'World',
      'Calc',
      'Alarm',
      'Display',
      'Settings',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeTruthy()
    }
  })

  it('marks exactly the current route, whatever the hash spelling', () => {
    render(<TopBar route="countdown" />)
    expect(screen.getByRole('link', { name: 'Countdown' }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(screen.getByRole('link', { name: 'Stopwatch' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('aria-current')).toBeNull()
  })

  it('marks settings when the route is settings', () => {
    render(<TopBar route="settings" />)
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('aria-current')).toBe('page')
  })
})
