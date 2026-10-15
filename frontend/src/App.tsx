import { useState, useEffect, useRef } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
  }
}

type SyncMessage = {
  type: 'action' | 'sync'
  position: number
  state: 'playing' | 'paused'
}

// Dummy video ID for testing.
const VIDEO_ID = 'kzcI5F4tGiU'
// Positions further apart than this count as a seek, and get corrected.
const SEEK_THRESHOLD_S = 1
// How often to check for a seek while paused (YouTube fires no event for it).
const PAUSED_CHECK_INTERVAL_MS = 500
// How often to send our position to the partner while playing.
const SYNC_INTERVAL_MS = 2000

function App() {
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState('Loading...')
  const playerRef = useRef<YT.Player | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<number | null>(null)
  const lastStateRef = useRef<{
    state: SyncMessage['state']
    position: number
    at: number
  } | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok: ' + response.status)
        }
        return response.text()
      })
      .then((data) => setMessage(data))
      .catch((error) =>
        setMessage('Error fetching health status: ' + error.message),
      )
  }, [])

  useEffect(() => {
    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    const sendAction = (position: number, state: SyncMessage['state']) => {
      const last = lastStateRef.current
      if (last && last.state === state) {
        const expectedPosition =
          state === 'playing'
            ? last.position + (Date.now() - last.at) / 1000
            : last.position
        if (Math.abs(expectedPosition - position) <= SEEK_THRESHOLD_S) {
          return
        }
      }
      const msg: SyncMessage = { type: 'action', position, state }
      socketRef.current?.send(JSON.stringify(msg))
      lastStateRef.current = { state, position, at: Date.now() }
    }

    const sendSync = (position: number) => {
      const msg: SyncMessage = { type: 'sync', position, state: 'playing' }
      socketRef.current?.send(JSON.stringify(msg))
      lastStateRef.current = { state: 'playing', position, at: Date.now() }
    }

    const createYouTubePlayer = () => {
      playerRef.current = new YT.Player('player', {
        videoId: VIDEO_ID,
        events: {
          onStateChange: (e) => {
            stopTimer()
            if (
              e.data !== YT.PlayerState.PLAYING &&
              e.data !== YT.PlayerState.PAUSED
            )
              return
            sendAction(
              e.target.getCurrentTime(),
              e.data === YT.PlayerState.PLAYING ? 'playing' : 'paused',
            )

            if (e.data === YT.PlayerState.PAUSED) {
              let previousTime = e.target.getCurrentTime()
              timerRef.current = setInterval(() => {
                const currentTime = e.target.getCurrentTime()
                if (Math.abs(currentTime - previousTime) > SEEK_THRESHOLD_S) {
                  sendAction(currentTime, 'paused')
                  previousTime = currentTime
                }
              }, PAUSED_CHECK_INTERVAL_MS)
            }

            if (e.data === YT.PlayerState.PLAYING) {
              timerRef.current = setInterval(() => {
                sendSync(e.target.getCurrentTime())
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
  }, [])

  useEffect(() => {
    // room code is the 3rd segment of the URL path (e.g., /room/{code})
    const code = window.location.pathname.split('/')[2]
    if (!code) return

    socketRef.current = new WebSocket(`/api/rooms/${code}/ws`)
    socketRef.current.onmessage = (e) => {
      const msg: SyncMessage = JSON.parse(e.data)
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
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) return
        // How far ahead the partner is. If positive, we are behind them.
        const gap = msg.position - player.getCurrentTime()
        if (gap > SEEK_THRESHOLD_S) {
          lastStateRef.current = {
            state: 'playing',
            position: msg.position,
            at: Date.now(),
          }
          player.seekTo(msg.position, true)
        }
      }
    }

    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  return (
    <>
      <section id="center">
        <div id="player"></div>
        <button type="button" onClick={() => playerRef.current?.playVideo()}>
          Play
        </button>
        <button type="button" onClick={() => playerRef.current?.pauseVideo()}>
          Pause
        </button>
        <button
          type="button"
          onClick={() => playerRef.current?.seekTo(60, true)}
        >
          Skip to 1:00
        </button>
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get Ready!!</h1>
          <p>{message}</p>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
