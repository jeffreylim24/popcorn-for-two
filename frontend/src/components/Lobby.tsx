import { Headphones, Mic, MicOff, Popcorn, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelfView } from '@/components/SelfView'
import { micLabel } from '@/mic'

type LobbyProps = {
  code: string
  stream: MediaStream | null
  cameraError: 'denied' | 'unavailable' | null
  cameraOn: boolean
  onToggleCamera: () => void
  micError: 'denied' | 'unavailable' | null
  micOn: boolean
  onToggleMic: () => void
  onJoin: () => void
}

/**
 * The check-your-hair screen before the room. It only draws; `RoomPage` owns
 * the camera, the mic and the joined flag.
 */
export function Lobby({
  code,
  stream,
  cameraError,
  cameraOn,
  onToggleCamera,
  micError,
  micOn,
  onToggleMic,
  onJoin,
}: LobbyProps) {
  // Sits under the preview: the video or the "blocked" card covers it.
  const placeholder = !cameraOn
    ? 'Camera is off'
    : cameraError === 'unavailable'
      ? 'No camera found'
      : 'Starting camera…'

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
      <section className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
        <div className="text-center">
          <p className="font-heading text-xs tracking-widest text-primary uppercase">
            almost showtime
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold">
            Ready for movie night?
          </h1>
        </div>
        <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-2xl border-4 border-foreground/80 bg-foreground shadow-xl">
          <p className="absolute inset-0 flex items-center justify-center font-heading text-sm text-background/70">
            {placeholder}
          </p>
          <SelfView
            stream={stream}
            error={cameraError}
            className="absolute inset-0 size-full rounded-none border-0 shadow-none"
          />
        </div>
        {/* Phones: camera and mic share a row, Join gets its own. */}
        <div className="grid w-full max-w-xl grid-cols-2 gap-3 sm:flex sm:w-auto">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11 px-5 font-heading text-base"
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
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11 px-5 font-heading text-base"
            onClick={onToggleMic}
            aria-pressed={micOn}
            // Nothing to mute without a mic.
            disabled={micError !== null}
          >
            {micOn && !micError ? (
              <Mic data-icon="inline-start" aria-hidden="true" />
            ) : (
              <MicOff data-icon="inline-start" aria-hidden="true" />
            )}
            {micLabel(micError, micOn)}
          </Button>
          <Button
            type="button"
            size="lg"
            className="col-span-2 h-11 px-6 font-heading text-base"
            onClick={onJoin}
          >
            Join room
          </Button>
        </div>
        <p className="flex items-center gap-2 font-heading text-sm text-muted-foreground">
          <Headphones className="size-4" aria-hidden="true" />
          Headphones recommended, so the movie doesn't echo back to your
          partner.
        </p>
      </section>
    </main>
  )
}
