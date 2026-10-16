import { useHealth } from './hooks/useHealth'
import { useSync } from './hooks/useSync'

// Dummy video ID for testing.
const VIDEO_ID = 'kzcI5F4tGiU'

async function createAndJoinRoom() {
  const response = await fetch('/api/rooms', { method: 'POST' })
  if (!response.ok) {
    console.error('Failed to create room:', response.status)
    return
  }
  const code = await response.text()
  window.location.assign(`/room/${code}`)
}

function App() {
  const message = useHealth()

  // room code is the 3rd segment of the URL path (e.g., /room/{code})
  const code = window.location.pathname.split('/')[2]
  const playerRef = useSync(code, 'player', VIDEO_ID)

  if (!code) {
    return (
      <button type="button" onClick={createAndJoinRoom}>
        Create room
      </button>
    )
  }

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
