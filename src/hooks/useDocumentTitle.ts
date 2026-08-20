import { useEffect } from 'react'
import { buildTitle, type TitleInput } from './documentTitle.ts'

/** Writes the priority title; restores the plain app name on unmount. */
export function useDocumentTitle(input: TitleInput, now: number): void {
  useEffect(() => {
    document.title = buildTitle(input, now)
    // Without this, navigating away from a running countdown left the tab
    // frozen on its last value — "19:42 · tick" forever, while the real timer
    // kept going. The doc comment promised the restore; the code never did it.
    return () => {
      document.title = 'tick'
    }
  }, [input, now])
}
