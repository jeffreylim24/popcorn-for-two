import { MotionConfig } from 'motion/react'
import { Toaster } from '@/components/ui/sonner'
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
 * `Toaster` is mounted once here, so `toast()` works from any page or plain
 * function.
 */
function App() {
  return (
    <MotionConfig reducedMotion="user">
      {pickPage()}
      <Toaster />
    </MotionConfig>
  )
}

export default App
