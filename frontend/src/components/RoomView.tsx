import type { RoomStatus } from '@/hooks/useRoomSocket'
import { useSync } from '@/hooks/useSync'
import { Popcorn, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createAndJoinRoom } from '@/rooms'
import { SelfView } from '@/components/SelfView'
import { VideoPicker } from '@/components/VideoPicker'

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

type RoomViewProps = {
  code: string
  stream: MediaStream | null
  error: 'denied' | 'unavailable' | null
  cameraOn: boolean
  onToggleCamera: () => void
}

// The room after Join. useSync lives here, not in RoomPage, so the socket
// opens only once this mounts (and #player exists by then).
export function RoomView({
  code,
  stream,
  error,
  cameraOn,
  onToggleCamera,
}: RoomViewProps) {
  const { status, reconnect, pickVideo } = useSync(code, 'player', VIDEO_ID)
  const statusText = STATUS_TEXT[status]

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <a href="/" className="font-heading text-xl font-bold">
          popcorn for <span className="text-primary">two</span>
        </a>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full font-heading text-xs"
            onClick={onToggleCamera}
            aria-pressed={cameraOn}
          >
            {cameraOn ? (
              <Video data-icon="inline-start" aria-hidden="true" />
            ) : (
              <VideoOff data-icon="inline-start" aria-hidden="true" />
            )}
            {cameraOn ? 'Camera on' : 'Camera off'}
          </Button>
          <span className="flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 font-heading text-xs">
            <Popcorn className="size-3.5 text-primary" aria-hidden="true" />
            room {code}
          </span>
        </div>
      </header>
      <section className="flex flex-1 flex-col justify-center gap-4 py-8">
        {/* YouTube replaces #player with an iframe, so the wrapper does the sizing. */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-4 border-foreground/80 bg-foreground shadow-xl [&>iframe]:size-full">
          <div id="player" />
          <SelfView stream={stream} error={error} />
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
        <VideoPicker onPick={pickVideo} />
        <p className="text-center font-heading text-sm text-muted-foreground">
          Send this page's link to your person. Play, pause and seek stay in
          sync.
        </p>
      </section>
    </main>
  )
}
