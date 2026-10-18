import { useRef } from 'react'
import {
  isNews,
  parsePlaybackMessage,
  parseVideoMessage,
  SEEK_THRESHOLD_S,
  shouldCatchUp,
} from '../sync'
import type { AgreedState, PlaybackMessage, VideoMessage } from '../sync'
import { parseVideoId } from '../youtube'
import { useRoomSocket } from './useRoomSocket'
import { useYouTubePlayer } from './useYouTubePlayer'

/**
 * Keeps this tab's player in sync with the partner's: applies incoming
 * messages and sends only real news. Returns the player ref, status,
 * reconnect function, and `pickVideo` to switch both tabs to a new link.
 */
export function useSync(code: string, elementId: string, videoId: string) {
  const playerRef = useRef<YT.Player | null>(null)
  const lastStateRef = useRef<AgreedState | null>(null)
  // The server sends the room's video as soon as we join, usually before
  // the player is ready. It waits here until onReady.
  const pendingVideoRef = useRef<string | null>(null)

  // A new video starts paused at 0 on both tabs, so the agreed state resets
  // with it.
  const cueVideo = (id: string) => {
    const player = playerRef.current
    if (!player) {
      pendingVideoRef.current = id
      return
    }
    player.cueVideoById(id)
    lastStateRef.current = { state: 'paused', position: 0, at: Date.now() }
  }

  const { send, status, reconnect } = useRoomSocket(code, (data) => {
    const videoMsg = parseVideoMessage(data)
    if (videoMsg) {
      cueVideo(videoMsg.videoId)
      return
    }

    const msg = parsePlaybackMessage(data)
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

  const sendAction = (position: number, state: PlaybackMessage['state']) => {
    if (!isNews(lastStateRef.current, state, position, Date.now())) return
    const msg: PlaybackMessage = { type: 'action', position, state }
    send(JSON.stringify(msg))
    lastStateRef.current = { state, position, at: Date.now() }
  }

  const sendSync = (position: number) => {
    const msg: PlaybackMessage = { type: 'sync', position, state: 'playing' }
    send(JSON.stringify(msg))
    lastStateRef.current = { state: 'playing', position, at: Date.now() }
  }

  // Cues locally too: the server doesn't echo a message back to its sender.
  const pickVideo = (link: string) => {
    const id = parseVideoId(link)
    if (!id) return false
    cueVideo(id)
    const msg: VideoMessage = { type: 'video', videoId: id }
    send(JSON.stringify(msg))
    return true
  }

  const cuePendingVideo = () => {
    const id = pendingVideoRef.current
    if (!id) return
    pendingVideoRef.current = null
    cueVideo(id)
  }

  useYouTubePlayer(playerRef, elementId, videoId, {
    onLocalChange: sendAction,
    onPlayingTick: sendSync,
    onReady: cuePendingVideo,
  })

  return { playerRef, status, reconnect, pickVideo }
}
