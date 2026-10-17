import { useRef } from 'react'
import {
  isNews,
  parseSyncMessage,
  SEEK_THRESHOLD_S,
  shouldCatchUp,
} from '../sync'
import type { AgreedState, SyncMessage } from '../sync'
import { useRoomSocket } from './useRoomSocket'
import { useYouTubePlayer } from './useYouTubePlayer'

/**
 * Keeps this tab's player in sync with the partner's: applies incoming
 * messages and sends only real news. Returns the player ref and status for direct use.
 */
export function useSync(code: string, elementId: string, videoId: string) {
  const playerRef = useRef<YT.Player | null>(null)
  const lastStateRef = useRef<AgreedState | null>(null)

  const { send, status } = useRoomSocket(code, (data) => {
    const msg = parseSyncMessage(data)
    if (!msg) return
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

  useYouTubePlayer(playerRef, elementId, videoId, {
    onLocalChange: sendAction,
    onPlayingTick: sendSync,
  })

  return { playerRef, status }
}
