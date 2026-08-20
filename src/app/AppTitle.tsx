import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { useNow } from '../hooks/useNow.tsx'
import { useStore } from '../store/context.ts'
import { titleInput } from './title.ts'

/**
 * The one writer of the tab title.
 *
 * A component rather than a hook in the shell, for one reason: it reads the
 * ticker, and everything that reads the ticker re-renders four times a
 * second. Down here that costs a null; up in `Shell` it would cost the
 * navigation and the whole routed tool along with it.
 */
export function AppTitle(): null {
  const state = useStore()
  const now = useNow()
  useDocumentTitle(titleInput(state, now), now)
  return null
}
