import { useEffect, useEffectEvent, useRef, type RefObject } from 'react'
import { SEEK_THRESHOLD_S } from '../sync'
import type { SyncMessage } from '../sync'

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
  }
}

/**
 * How often to check for a seek while paused (YouTube fires no event for it).
 */
const PAUSED_CHECK_INTERVAL_MS = 500
/**
 * How often to send our position to the partner while playing.
 */
const SYNC_INTERVAL_MS = 2000

export function useYouTubePlayer(
  playerRef: RefObject<YT.Player | null>,
  elementId: string,
  videoId: string,
  callbacks: {
    onLocalChange: (position: number, state: SyncMessage['state']) => void
    onPlayingTick: (position: number) => void
  },
) {
  const timerRef = useRef<number | null>(null)
  const onLocalChange = useEffectEvent(callbacks.onLocalChange)
  const onPlayingTick = useEffectEvent(callbacks.onPlayingTick)

  useEffect(() => {
    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    const createYouTubePlayer = () => {
      playerRef.current = new YT.Player(elementId, {
        videoId,
        events: {
          onStateChange: (e) => {
            stopTimer()
            if (
              e.data !== YT.PlayerState.PLAYING &&
              e.data !== YT.PlayerState.PAUSED
            )
              return
            onLocalChange(
              e.target.getCurrentTime(),
              e.data === YT.PlayerState.PLAYING ? 'playing' : 'paused',
            )

            if (e.data === YT.PlayerState.PAUSED) {
              let previousTime = e.target.getCurrentTime()
              timerRef.current = setInterval(() => {
                const currentTime = e.target.getCurrentTime()
                if (Math.abs(currentTime - previousTime) > SEEK_THRESHOLD_S) {
                  onLocalChange(currentTime, 'paused')
                  previousTime = currentTime
                }
              }, PAUSED_CHECK_INTERVAL_MS)
            }

            if (e.data === YT.PlayerState.PLAYING) {
              timerRef.current = setInterval(() => {
                onPlayingTick(e.target.getCurrentTime())
              }, SYNC_INTERVAL_MS)
            }
          },
        },
      })
    }

    if (YT.Player) {
      createYouTubePlayer()
    } else {
      window.onYouTubeIframeAPIReady = createYouTubePlayer
    }

    return () => {
      stopTimer()
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [playerRef, elementId, videoId])
}
