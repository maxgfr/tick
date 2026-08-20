import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Readout } from './Readout.tsx'

describe('Readout', () => {
  it('puts every figure in its own cell and keeps separators bare', () => {
    const { container } = render(<Readout text="1:00" />)
    const row = container.querySelector('.readout')
    expect(row?.getAttribute('aria-hidden')).toBe('true')

    const cells = row?.querySelectorAll('.cell') ?? []
    expect(cells.length).toBe(3)
    expect(cells[0]?.textContent).toBe('1')
    expect(cells[1]?.textContent).toBe('0')
    expect(cells[2]?.textContent).toBe('0')

    const seps = row?.querySelectorAll('.readout-sep') ?? []
    expect(seps.length).toBe(1)
    expect(seps[0]?.textContent).toBe(':')
  })

  it('exposes the plain value exactly once for screen readers and queries', () => {
    render(<Readout text="12:05" />)
    expect(screen.getByText('12:05')).toBeTruthy()
  })

  it('keeps every cell in place when a figure changes — nothing remounts', () => {
    const { container, rerender } = render(<Readout text="1:00" />)
    const before = container.querySelectorAll('.cell')

    rerender(<Readout text="1:01" />)
    const after = container.querySelectorAll('.cell')
    expect(after.length).toBe(3)
    // Every cell is the same DOM node, the changed one included. Keying by
    // character used to make it a new element so it could replay a flip —
    // which is also why a route change turned the whole readout over at once.
    expect(after[0]).toBe(before[0])
    expect(after[1]).toBe(before[1])
    expect(after[2]).toBe(before[2])
    expect(after[2]?.textContent).toBe('1')
  })

  it('carries no animation class, and treats the dot as a separator', () => {
    const { container } = render(<Readout text="5.4" />)
    const cells = container.querySelectorAll('.cell')
    expect(cells[0]?.className).not.toContain('cell-turn')
    expect(cells.length).toBe(2)
    expect(container.querySelector('.readout-sep')?.textContent).toBe('.')
  })
})
