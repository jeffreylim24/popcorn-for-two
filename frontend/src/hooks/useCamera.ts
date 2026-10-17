import { useEffect, useState } from 'react'

export function useCamera(enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<'denied' | 'unavailable' | null>(null)

  useEffect(() => {
    if (!enabled) return
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
