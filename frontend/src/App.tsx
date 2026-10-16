import { useHealth } from './hooks/useHealth'
import { useSync } from './hooks/useSync'

// Dummy video ID for testing.
const VIDEO_ID = 'kzcI5F4tGiU'

function App() {
  const message = useHealth()

  // room code is the 3rd segment of the URL path (e.g., /room/{code})
  const code = window.location.pathname.split('/')[2]
  const playerRef = useSync(code, 'player', VIDEO_ID)

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
