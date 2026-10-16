import { useRef } from 'react'
import { isNews, SEEK_THRESHOLD_S, shouldCatchUp } from './sync'
import type { AgreedState, SyncMessage } from './sync'
import { useHealth } from './hooks/useHealth'
import { useRoomSocket } from './hooks/useRoomSocket'
import { useYouTubePlayer } from './hooks/useYouTubePlayer'

// Dummy video ID for testing.
const VIDEO_ID = 'kzcI5F4tGiU'

function App() {
  const playerRef = useRef<YT.Player | null>(null)
  const lastStateRef = useRef<AgreedState | null>(null)

  const message = useHealth()

  // room code is the 3rd segment of the URL path (e.g., /room/{code})
  const code = window.location.pathname.split('/')[2]
  const send = useRoomSocket(code, (data) => {
    const msg: SyncMessage = JSON.parse(data)
    const player = playerRef.current
    if (!player) return

    if (msg.type === 'action') {
      lastStateRef.current = {
        state: msg.state,
        position: msg.position,
        at: Date.now(),
      }
      const gap = Math.abs(player.getCurrentTime() - msg.position)
      if (gap > SEEK_THRESHOLD_S) {
        player.seekTo(msg.position, true)
      }
      if (msg.state === 'playing') {
        player.playVideo()
      }
      if (msg.state === 'paused') {
        player.pauseVideo()
      }
    }

    if (msg.type === 'sync') {
      const isPlaying = player.getPlayerState() === YT.PlayerState.PLAYING
      if (!shouldCatchUp(isPlaying, player.getCurrentTime(), msg.position))
        return

      lastStateRef.current = {
        state: 'playing',
        position: msg.position,
        at: Date.now(),
      }
      player.seekTo(msg.position, true)
    }
  })

  const sendAction = (position: number, state: SyncMessage['state']) => {
    if (!isNews(lastStateRef.current, state, position, Date.now())) return
    const msg: SyncMessage = { type: 'action', position, state }
    send(JSON.stringify(msg))
    lastStateRef.current = { state, position, at: Date.now() }
  }

  const sendSync = (position: number) => {
    const msg: SyncMessage = { type: 'sync', position, state: 'playing' }
    send(JSON.stringify(msg))
    lastStateRef.current = { state: 'playing', position, at: Date.now() }
  }

  useYouTubePlayer(playerRef, 'player', VIDEO_ID, {
    onLocalChange: sendAction,
    onPlayingTick: sendSync,
  })

  return (
    <>
      <div id="player" />
      <button type="button" onClick={() => playerRef.current?.playVideo()}>
        Play
      </button>
      <button type="button" onClick={() => playerRef.current?.pauseVideo()}>
        Pause
      </button>
      <button type="button" onClick={() => playerRef.current?.seekTo(60, true)}>
        Skip to 1:00
      </button>
      <p>{message}</p>
    </>
  )
}

export default App
