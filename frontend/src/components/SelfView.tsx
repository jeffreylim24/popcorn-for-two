import { VideoOff } from 'lucide-react'
import { useEffect, useRef } from 'react'

type SelfViewProps = {
  stream: MediaStream | null
  error: 'denied' | 'unavailable' | null
}

// Your own facecam, drawn over the player's top-left corner so YouTube's
// control bar along the bottom stays clear.
export function SelfView({ stream, error }: SelfViewProps) {
  // TODO(you): a ref for the <video>, and an effect that puts `stream` into it.
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Chrome won't re-prompt after Block, so this says where to undo it.
  if (error === 'denied') {
    return (
      <div className="absolute top-3 left-3 flex w-1/4 max-w-56 flex-col items-center gap-1 rounded-xl border-2 border-background/80 bg-foreground/90 p-3 text-center text-background shadow-lg">
        <VideoOff className="size-5 text-primary" aria-hidden="true" />
        <p className="font-heading text-xs">Camera blocked</p>
        <p className="font-heading text-[11px] leading-snug opacity-80">
          Click the camera icon in the address bar to allow it, then reload.
        </p>
      </div>
    )
  }

  // No camera, or still waiting: no box at all.
  if (!stream) return null

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      // Mirrored, like looking in a mirror. Only on your own screen.
      className="absolute top-3 left-3 aspect-video w-1/4 max-w-56 -scale-x-100 rounded-xl border-2 border-background/80 bg-foreground object-cover shadow-lg"
    />
  )
}
