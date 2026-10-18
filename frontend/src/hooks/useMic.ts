import { useEffect, useState } from 'react'

/**
 * The microphone, asked for once while the room page is open. Muting
 * flips `track.enabled` (mic toggle step); leaving the page stops it.
 */
export function useMic() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<'denied' | 'unavailable' | null>(null)

  useEffect(() => {
    let cancelled = false
    let ownStream: MediaStream | null = null

    async function start() {
      try {
        ownStream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
  }, [])

  return { stream, error }
}
