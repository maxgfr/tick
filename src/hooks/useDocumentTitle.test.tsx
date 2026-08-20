import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle.ts'
import type { TitleInput } from './documentTitle.ts'

const Probe = ({ input, now }: { input: TitleInput; now: number }) => {
  useDocumentTitle(input, now)
  return null
}

describe('useDocumentTitle', () => {
  it('writes the priority title', () => {
    render(
      <Probe
        input={{ timers: [{ id: 't1', label: 'Tea', endAt: 1_000 + 60_000, totalMs: 60_000 }] }}
        now={1_000}
      />,
    )
    expect(document.title).toContain('tick')
    expect(document.title).not.toBe('tick')
  })

  it('restores the plain app name on unmount', () => {
    // A running countdown used to leave the tab frozen on its last value the
    // moment you navigated to another tool.
    const view = render(
      <Probe
        input={{ timers: [{ id: 't1', label: 'Tea', endAt: 1_000 + 60_000, totalMs: 60_000 }] }}
        now={1_000}
      />,
    )
    expect(document.title).not.toBe('tick')

    view.unmount()
    expect(document.title).toBe('tick')
  })
})
