import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TileRow } from './TileRow.tsx'

describe('TileRow', () => {
  it('renders one decorative cell per slot, filled up to the fraction', () => {
    const { container } = render(<TileRow cells={10} filled={4} />)
    const row = container.querySelector('.tile-row')
    expect(row?.getAttribute('aria-hidden')).toBe('true')

    const cells = row?.querySelectorAll('.tile-cell') ?? []
    expect(cells.length).toBe(10)
    // The board fills left to right.
    expect(cells[0]?.getAttribute('data-on')).toBe('true')
    expect(cells[3]?.getAttribute('data-on')).toBe('true')
    expect(cells[4]?.getAttribute('data-on')).toBe('false')
    expect(cells[9]?.getAttribute('data-on')).toBe('false')
  })

  it('clamps the filled count to the row length', () => {
    const { container } = render(<TileRow cells={6} filled={9} />)
    const on = [...container.querySelectorAll('.tile-cell')].filter(
      (cell) => cell.getAttribute('data-on') === 'true',
    )
    expect(on.length).toBe(6)
  })

  it('rounds a fractional fill to the nearest tile', () => {
    const { container } = render(<TileRow cells={4} filled={1.6} />)
    const on = [...container.querySelectorAll('.tile-cell')].filter(
      (cell) => cell.getAttribute('data-on') === 'true',
    )
    expect(on.length).toBe(2)
  })
})

describe('TileRow, defensively', () => {
  it('fills nothing rather than printing NaN when the total is zero', () => {
    // An all-zero interval config makes every caller divide by zero.
    const { container } = render(<TileRow cells={6} filled={Number.NaN} />)
    const row = container.querySelector('.tile-row')
    expect(row?.getAttribute('data-filled')).toBe('0')
    expect(container.querySelectorAll('[data-on="true"]')).toHaveLength(0)
  })

  it('ignores an infinite fill the same way', () => {
    const { container } = render(<TileRow cells={6} filled={Number.POSITIVE_INFINITY} />)
    expect(container.querySelector('.tile-row')?.getAttribute('data-filled')).toBe('0')
  })
})
