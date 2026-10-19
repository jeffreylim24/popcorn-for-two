import { useEffect, useState, type RefObject } from 'react'

/**
 * Fullscreen for one of our own elements (not the YouTube iframe, so what's
 * inside it, like the cams, comes along). `isFullscreen` follows the browser,
 * so leaving with Esc updates it too.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(
        ref.current !== null && document.fullscreenElement === ref.current,
      )
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [ref])

  /** Enters fullscreen, or leaves it if we're in it. */
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      return
    }
    // Rejects if the browser refuses (e.g. not from a click): nothing to undo.
    ref.current?.requestFullscreen().catch((err) => {
      console.warn('fullscreen: refused', err)
    })
  }

  return { isFullscreen, toggleFullscreen }
}
