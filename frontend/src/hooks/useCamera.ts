import { useEffect, useState } from 'react'

/**
 * The camera, running while `enabled` is true. Turning it off stops the
 * tracks so the camera light goes off; turning it back on asks again.
 * `error` says why there's no stream: blocked, or no camera found.
 */
export function useCamera(enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<'denied' | 'unavailable' | null>(null)

  useEffect(() => {
    if (!enabled) return
    // Set by the cleanup. If it runs while the permission prompt is still
    // open, the stream that arrives later is stopped instead of kept.
    let cancelled = false
    let ownStream: MediaStream | null = null

    async function start() {
      try {
        ownStream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (cancelled) {
          ownStream.getTracks().forEach((track) => track.stop())
          return
        }
        setStream(ownStream)
      } catch (err) {
        if (cancelled) return
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError('denied')
        } else {
          setError('unavailable')
        }
      }
    }
    start()

    return () => {
      setError(null)
      if (ownStream) {
        ownStream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }
      cancelled = true
    }
  }, [enabled])

  return { stream, error }
}
