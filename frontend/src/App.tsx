import { HomePage } from '@/pages/HomePage'
import { RoomPage } from '@/pages/RoomPage'

function App() {
  // room code is the 3rd segment of the URL path (e.g., /room/{code})
  const code = window.location.pathname.split('/')[2]

  if (!code) return <HomePage />
  return <RoomPage code={code} />
}

export default App
