import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Gauge } from './Gauge.tsx'

describe('Gauge', () => {
  it('renders one decorative cell per slot, filled up to the fraction', () => {
    const { container } = render(<Gauge cells={10} filled={4} />)
    const row = container.querySelector('.gauge')
    expect(row?.getAttribute('aria-hidden')).toBe('true')

    const cells = row?.querySelectorAll('.gauge-cell') ?? []
    expect(cells.length).toBe(10)
    // The gauge fills left to right.
    expect(cells[0]?.getAttribute('data-on')).toBe('true')
    expect(cells[3]?.getAttribute('data-on')).toBe('true')
    expect(cells[4]?.getAttribute('data-on')).toBe('false')
    expect(cells[9]?.getAttribute('data-on')).toBe('false')
  })

  it('clamps the filled count to the row length', () => {
    const { container } = render(<Gauge cells={6} filled={9} />)
    const on = [...container.querySelectorAll('.gauge-cell')].filter(
      (cell) => cell.getAttribute('data-on') === 'true',
    )
    expect(on.length).toBe(6)
  })

  it('rounds a fractional fill to the nearest tile', () => {
    const { container } = render(<Gauge cells={4} filled={1.6} />)
    const on = [...container.querySelectorAll('.gauge-cell')].filter(
      (cell) => cell.getAttribute('data-on') === 'true',
    )
    expect(on.length).toBe(2)
  })
})

describe('Gauge, defensively', () => {
  it('fills nothing rather than printing NaN when the total is zero', () => {
    // An all-zero interval config makes every caller divide by zero.
    const { container } = render(<Gauge cells={6} filled={Number.NaN} />)
    const row = container.querySelector('.gauge')
    expect(row?.getAttribute('data-filled')).toBe('0')
    expect(container.querySelectorAll('[data-on="true"]')).toHaveLength(0)
  })

  it('ignores an infinite fill the same way', () => {
    const { container } = render(<Gauge cells={6} filled={Number.POSITIVE_INFINITY} />)
    expect(container.querySelector('.gauge')?.getAttribute('data-filled')).toBe('0')
  })
})
