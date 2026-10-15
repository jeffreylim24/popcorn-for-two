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

function App() {
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState("Loading...")
  const playerRef = useRef<YT.Player | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok: " + response.status);
        }
        return response.text();
      })
      .then((data) => setMessage(data))
      .catch(error => setMessage("Error fetching health status: " + error.message));
  }, [])

  useEffect(() => {
  const createYouTubePlayer = () => {
      playerRef.current = new YT.Player('player', {
        videoId: 'kzcI5F4tGiU',
        events: {
          onStateChange: (e) => {
            console.log('state change: ', e.data)
            if (e.data !== YT.PlayerState.PLAYING && e.data !== YT.PlayerState.PAUSED) return
            const msg: SyncMessage = {
              type: 'action',
              position: e.target.getCurrentTime(),
              state: e.data === YT.PlayerState.PLAYING ? 'playing' : 'paused',
            }
            socketRef.current?.send(JSON.stringify(msg))
          },
        }
      })
    }

    if (YT.Player) {
      createYouTubePlayer()
    } else {
      window.onYouTubeIframeAPIReady = createYouTubePlayer
    }

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  useEffect(() => {
    // room code is the 3rd segment of the URL path (e.g., /room/{code})
    const code = window.location.pathname.split("/")[2]
    if (!code) return

    socketRef.current = new WebSocket(`/api/rooms/${code}/ws`)
    socketRef.current.onmessage = (e) => {
      const msg: SyncMessage = JSON.parse(e.data)
      const player = playerRef.current
      if (!player) return

      if (msg.type === 'action') {
        const gap = Math.abs(player.getCurrentTime() - msg.position)
        if (gap > 1) {
          player.seekTo(msg.position, true)
        }
        if (msg.state === 'playing') {
          player.playVideo()
        }
        if (msg.state === 'paused') {
          player.pauseVideo()
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
        <div id='player'></div>
        <button
          type="button"
          onClick={() => playerRef.current?.playVideo()}
        >
          Play
        </button>
        <button
          type="button"
          onClick={() => playerRef.current?.pauseVideo()}
        >
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
