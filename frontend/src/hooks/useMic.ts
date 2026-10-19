import { useEffect, useState } from 'react'

/**
 * The microphone, asked for once while the room page is open. Muting
 * flips `track.enabled`: the mic keeps running and the call keeps the
 * same track, it just carries silence. Leaving the page stops it.
 */
export function useMic(on: boolean) {
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

  // Also runs when the stream arrives, so a mute pressed before then holds.
  useEffect(() => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = on
    })
  }, [stream, on])

  return { stream, error }
}
