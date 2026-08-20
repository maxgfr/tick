import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TOOLS } from '../../app/tools.ts'
import { HelpOverlay } from './HelpOverlay.tsx'

describe('HelpOverlay', () => {
  it('lists the eight tools with their number keys', () => {
    render(<HelpOverlay onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' })
    for (const tool of TOOLS) {
      expect(dialog.textContent).toContain(tool.name)
    }
  })

  it('documents the global keys too', () => {
    render(<HelpOverlay onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' }).textContent
    expect(dialog).toContain('?')
    expect(dialog?.toLowerCase()).toContain('mute')
    expect(dialog?.toLowerCase()).toContain('fullscreen')
  })

  it('closes on the button and on Escape', () => {
    const onClose = vi.fn()
    render(<HelpOverlay onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
