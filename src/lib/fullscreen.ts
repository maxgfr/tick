/** Fullscreen, feature-detected: the display tool works without it too. */
export function isFullscreen(): boolean {
  return document.fullscreenElement !== null
}

export function toggleFullscreen(element?: HTMLElement): void {
  if (document.fullscreenElement !== null) {
    void document.exitFullscreen()
    return
  }
  const target = element ?? document.documentElement
  if (typeof target.requestFullscreen === 'function') {
    void target.requestFullscreen().catch(() => {
      // Denied (e.g. not from a user gesture): the display still fills the viewport.
    })
  }
}

export function onFullscreenChange(callback: () => void): () => void {
  document.addEventListener('fullscreenchange', callback)
  return () => document.removeEventListener('fullscreenchange', callback)
}
