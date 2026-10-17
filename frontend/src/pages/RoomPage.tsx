import type { RoomStatus } from '@/hooks/useRoomSocket'
import { useSync } from '@/hooks/useSync'
import { Popcorn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createAndJoinRoom } from '@/rooms'
import { useCamera } from '@/hooks/useCamera'
import { SelfView } from '@/components/SelfView'

// Dummy video ID for testing.
const VIDEO_ID = 'kzcI5F4tGiU'

// Record forces an entry per status, so a new status can't be forgotten here.
const STATUS_TEXT: Record<
  RoomStatus,
  {
    title: string
    detail: string
    action: 'create' | 'reconnect' | null
  } | null
> = {
  connecting: {
    title: 'Finding your room…',
    detail: 'Just a moment.',
    action: null,
  },
  connected: null,
  'not-found': {
    title: 'Room not found',
    detail: 'The link may be mistyped, or the room has closed.',
    action: 'create',
  },
  full: {
    title: 'Room is full',
    detail: 'Two people are already here.',
    action: 'create',
  },
  disconnected: {
    title: 'Connection lost',
    detail: 'The connection to the room dropped.',
    action: 'reconnect',
  },
}

export function RoomPage({ code }: { code: string }) {
  const { status, reconnect } = useSync(code, 'player', VIDEO_ID)
  const camera = useCamera(true)
  const statusText = STATUS_TEXT[status]

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <a href="/" className="font-heading text-xl font-bold">
          popcorn for <span className="text-primary">two</span>
        </a>
        <span className="flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 font-heading text-xs">
          <Popcorn className="size-3.5 text-primary" aria-hidden="true" />
          room {code}
        </span>
      </header>
      <section className="flex flex-1 flex-col justify-center gap-4 py-8">
        {/* YouTube replaces #player with an iframe, so the wrapper does the sizing. */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-4 border-foreground/80 bg-foreground shadow-xl [&>iframe]:size-full">
          <div id="player" />
          <SelfView stream={camera.stream} error={camera.error} />
          {/* Drawn over the player, not instead of it: YouTube keeps hold of #player. */}
          {statusText && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-foreground/90 p-6 text-center text-background">
              <p className="font-heading text-xl">{statusText.title}</p>
              <p className="font-heading text-sm opacity-80">
                {statusText.detail}
              </p>
              {statusText.action === 'create' && (
                <Button
                  type="button"
                  size="lg"
                  className="mt-3 h-11 px-6 font-heading text-base"
                  onClick={createAndJoinRoom}
                >
                  Create a new room
                </Button>
              )}
              {statusText.action === 'reconnect' && (
                <Button
                  type="button"
                  size="lg"
                  className="mt-3 h-11 px-6 font-heading text-base"
                  onClick={reconnect}
                >
                  Reconnect
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="text-center font-heading text-sm text-muted-foreground">
          Send this page's link to your person. Play, pause and seek stay in
          sync.
        </p>
      </section>
    </main>
  )
}
