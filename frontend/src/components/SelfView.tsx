import { VideoOff } from 'lucide-react'
import { useEffect, useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type SelfViewProps = {
  stream: MediaStream | null
  error: 'denied' | 'unavailable' | null
  // Size and position, set by the parent (the lobby's is fixed, the room's moves).
  className?: string
  style?: CSSProperties
}

// Your own facecam.
export function SelfView({ stream, error, className, style }: SelfViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Chrome won't re-prompt after Block, so this says where to undo it.
  if (error === 'denied') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-background/80 bg-foreground/90 p-3 text-center text-background shadow-lg',
          className,
        )}
        style={style}
      >
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
      className={cn(
        'aspect-video -scale-x-100 rounded-xl border-2 border-background/80 bg-foreground object-cover shadow-lg',
        className,
      )}
      style={style}
    />
  )
}
