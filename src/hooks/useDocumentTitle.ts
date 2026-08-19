import { useEffect } from 'react'
import { buildTitle, type TitleInput } from './documentTitle.ts'

/** Writes the priority title; restores the plain app name on unmount. */
export function useDocumentTitle(input: TitleInput, now: number): void {
  useEffect(() => {
    document.title = buildTitle(input, now)
  }, [input, now])
}
