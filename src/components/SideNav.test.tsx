import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CHROME, TOOLS } from '../app/tools.ts'
import { SideNav } from './SideNav.tsx'

describe('SideNav', () => {
  it('shows every destination at once — no scroller, no overflow menu', () => {
    render(<SideNav route="countdown" />)
    for (const item of [...TOOLS, ...CHROME]) {
      expect(screen.getByRole('link', { name: new RegExp(item.nav) })).toBeTruthy()
    }
  })

  it('groups the tools under their section headings', () => {
    render(<SideNav route="countdown" />)
    expect(screen.getByText('Timers')).toBeTruthy()
    expect(screen.getByText('Clocks')).toBeTruthy()
  })

  it('marks the active row for assistive tech, not by colour alone', () => {
    render(<SideNav route="metronome" />)
    const active = screen.getByRole('link', { name: /Metronome/ })
    expect(active.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /World/ }).getAttribute('aria-current')).toBeNull()
  })

  it('treats display and settings as destinations too', () => {
    render(<SideNav route="display" />)
    expect(screen.getByRole('link', { name: /Display/ }).getAttribute('aria-current')).toBe('page')
  })
})
