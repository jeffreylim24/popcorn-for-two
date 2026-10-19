import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoomPage } from '@/pages/RoomPage'

/**
 * Picks the page from the URL path: `/`, `/room/{code}`, or not found.
 * Matched by hand, since three routes don't need a router library.
 */
function App() {
  const parts = window.location.pathname.split('/')

  if (parts.length === 2 && parts[1] === '') return <HomePage />
  if (parts.length === 3 && parts[1] === 'room' && parts[2] !== '') {
    return <RoomPage code={parts[2]} />
  }
  return <NotFoundPage />
}

export default App
