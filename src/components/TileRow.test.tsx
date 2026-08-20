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
