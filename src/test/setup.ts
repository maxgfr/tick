import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom ships none of the browser APIs the runtime touches. They are mocked
// here once; the engine never imports them, so tests stay deterministic.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia

if (!('randomUUID' in crypto)) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: vi.fn(() => '00000000-0000-4000-8000-000000000000'),
  })
}
