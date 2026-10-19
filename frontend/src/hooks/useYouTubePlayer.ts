import { useEffect, useEffectEvent, useRef, type RefObject } from 'react'
import { SEEK_THRESHOLD_S } from '../sync'
import type { PlaybackMessage } from '../sync'

declare global {
  interface Window {
    /** Called by the YouTube API script once `YT.Player` is ready to use. */
    onYouTubeIframeAPIReady?: () => void
  }
}

/** How often to check for a seek while paused (YouTube fires no event for it). */
const PAUSED_CHECK_INTERVAL_MS = 500
/** How often to send our position to the partner while playing. */
const SYNC_INTERVAL_MS = 2000

/**
 * Creates the YouTube player in the element with id `elementId` and reports
 * what the user does: `onLocalChange` on play, pause or a seek, and
 * `onPlayingTick` every few seconds while playing. `playerRef` holds the
 * player once it's ready, and null before.
 */
export function useYouTubePlayer(
  playerRef: RefObject<YT.Player | null>,
  elementId: string,
  videoId: string,
  callbacks: {
    onLocalChange: (position: number, state: PlaybackMessage['state']) => void
    onPlayingTick: (position: number) => void
    onReady: () => void
  },
) {
  /** The interval for the current state: seek checks or sync ticks. */
  const timerRef = useRef<number | null>(null)
  const onLocalChange = useEffectEvent(callbacks.onLocalChange)
  const onPlayingTick = useEffectEvent(callbacks.onPlayingTick)
  const onReady = useEffectEvent(callbacks.onReady)

  useEffect(() => {
    let player: YT.Player | null = null

    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    const createYouTubePlayer = () => {
      player = new YT.Player(elementId, {
        videoId,
        // No YouTube fullscreen button: it fullscreens only the iframe, which
        // hides our cams. RoomView has its own that keeps them.
        playerVars: { fs: 0 },
        events: {
          // The player's methods only exist from here on, so the ref stays
          // null until now and callers' `if (!player)` guards hold.
          onReady: () => {
            playerRef.current = player
            onReady()
          },
          onStateChange: (e) => {
            // Each state starts its own timer, if any: drop the last one.
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

    // index.html's API script defines `YT` at once but loads `YT.Player` in
    // the background. If that isn't done yet, it calls this global when it is.
    if (YT.Player) {
      createYouTubePlayer()
    } else {
      window.onYouTubeIframeAPIReady = createYouTubePlayer
    }

    return () => {
      stopTimer()
      // The local, not the ref: before onReady the ref is still null.
      player?.destroy()
      playerRef.current = null
    }
  }, [playerRef, elementId, videoId])
}
