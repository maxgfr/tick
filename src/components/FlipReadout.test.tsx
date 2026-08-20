import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FlipReadout } from './FlipReadout.tsx'

describe('FlipReadout', () => {
  it('puts every digit on a tile and keeps separators flat', () => {
    const { container } = render(<FlipReadout text="1:00" />)
    const row = container.querySelector('.flip-row')
    expect(row?.getAttribute('aria-hidden')).toBe('true')

    const flaps = row?.querySelectorAll('.flap') ?? []
    expect(flaps.length).toBe(3)
    expect(flaps[0]?.textContent).toBe('1')
    expect(flaps[1]?.textContent).toBe('0')
    expect(flaps[2]?.textContent).toBe('0')

    const seps = row?.querySelectorAll('.flip-sep') ?? []
    expect(seps.length).toBe(1)
    expect(seps[0]?.textContent).toBe(':')
  })

  it('exposes the plain value exactly once for screen readers and queries', () => {
    render(<FlipReadout text="12:05" />)
    expect(screen.getByText('12:05')).toBeTruthy()
  })

  it('keeps every tile in place when a digit changes — nothing remounts', () => {
    const { container, rerender } = render(<FlipReadout text="1:00" />)
    const before = container.querySelectorAll('.flap')

    rerender(<FlipReadout text="1:01" />)
    const after = container.querySelectorAll('.flap')
    expect(after.length).toBe(3)
    // Every tile is the same DOM node, the changed one included. Keying by
    // character used to make it a new element so it could replay a flip —
    // which is also why a route change turned the whole board over at once.
    expect(after[0]).toBe(before[0])
    expect(after[1]).toBe(before[1])
    expect(after[2]).toBe(before[2])
    expect(after[2]?.textContent).toBe('1')
  })

  it('carries no animation class, and treats the dot as a separator', () => {
    const { container } = render(<FlipReadout text="5.4" />)
    const flaps = container.querySelectorAll('.flap')
    expect(flaps[0]?.className).not.toContain('flap-turn')
    expect(flaps.length).toBe(2)
    expect(container.querySelector('.flip-sep')?.textContent).toBe('.')
  })
})
