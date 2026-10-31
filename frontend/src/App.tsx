import { MotionConfig } from 'motion/react'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoomPage } from '@/pages/RoomPage'

/**
 * Picks the page from the URL path: `/`, `/room/{code}`, or not found.
 * Matched by hand, since three routes don't need a router library.
 */
function pickPage() {
  const parts = window.location.pathname.split('/')

  if (parts.length === 2 && parts[1] === '') return <HomePage />
  if (parts.length === 3 && parts[1] === 'room' && parts[2] !== '') {
    return <RoomPage code={parts[2]} />
  }
  return <NotFoundPage />
}

/**
 * The app root. `reducedMotion="user"`: if the OS asks for less motion, every
 * `motion` component drops its movement and scaling and keeps only fades.
 */
function App() {
  return <MotionConfig reducedMotion="user">{pickPage()}</MotionConfig>
}

export default App
