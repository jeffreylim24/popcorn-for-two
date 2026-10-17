import { HomePage } from '@/pages/HomePage'
import { RoomPage } from '@/pages/RoomPage'

function App() {
  const parts = window.location.pathname.split('/')

  if (parts.length === 2 && parts[1] === '') return <HomePage />
  if (parts.length === 3 && parts[1] === 'room' && parts[2] !== '') {
    return <RoomPage code={parts[2]} />
  }
  return <p>page not found</p>
}

export default App
