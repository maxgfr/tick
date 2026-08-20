import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PRIMARY_TOOLS, SECONDARY_TOOLS } from '../app/tools.ts'
import { MobileNav } from './MobileNav.tsx'

describe('MobileNav', () => {
  it('gives the four primary tools a slot and puts the rest behind More', () => {
    render(<MobileNav route="countdown" />)
    for (const tool of PRIMARY_TOOLS) {
      expect(screen.getByRole('link', { name: new RegExp(tool.nav) })).toBeTruthy()
    }
    for (const tool of SECONDARY_TOOLS) {
      expect(screen.queryByRole('link', { name: new RegExp(tool.nav) })).toBeNull()
    }
    expect(screen.getByRole('button', { name: /More/ })).toBeTruthy()
  })

  it('opens the sheet with the remaining tools, display and settings', () => {
    render(<MobileNav route="countdown" />)
    fireEvent.click(screen.getByRole('button', { name: /More/ }))

    const sheet = screen.getByRole('dialog', { name: 'More tools' })
    expect(sheet).toBeTruthy()
    for (const tool of SECONDARY_TOOLS) {
      expect(screen.getByRole('link', { name: new RegExp(tool.nav) })).toBeTruthy()
    }
    expect(screen.getByRole('link', { name: /Display/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Settings/ })).toBeTruthy()
  })

  it('closes the sheet on Escape and on the scrim', () => {
    render(<MobileNav route="countdown" />)

    fireEvent.click(screen.getByRole('button', { name: /More/ }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'More tools' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /More/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'More tools' })).toBeNull()
  })

  it('lights the More tab, with the tool name, when the route is behind it', () => {
    // Otherwise the user sits on a screen whose tab is not lit.
    render(<MobileNav route="calculator" />)
    const more = screen.getByRole('button', { name: /Calc/ })
    expect(more.getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('button', { name: /More/ })).toBeNull()
  })

  it('marks a primary tool directly, and leaves More unlit', () => {
    render(<MobileNav route="interval" />)
    expect(screen.getByRole('link', { name: /Interval/ }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: /More/ }).getAttribute('aria-current')).toBeNull()
  })
})
