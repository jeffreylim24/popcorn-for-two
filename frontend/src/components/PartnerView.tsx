import { VideoOff } from 'lucide-react'
import { useEffect, useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type PartnerViewProps = {
  /** The partner's camera and mic from the call. Null = no call yet. */
  stream: MediaStream | null
  /** False = show "camera off" over the video (their last frame is frozen). */
  cameraOn: boolean
  className?: string
  style?: CSSProperties
}

/** The partner's facecam, with their sound. */
export function PartnerView({
  stream,
  cameraOn,
  className,
  style,
}: PartnerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // No partner on the call: no box at all.
  if (!stream) return null

  return (
    <div className={cn('relative', className)} style={style}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        // Not muted: this element plays the partner's voice (unmuted autoplay
        // is allowed because clicking Join counts as interacting with the
        // page). Not mirrored: you see them as they really are. Hidden, not
        // removed, when their camera is off, so their voice keeps playing.
        className={cn(
          'aspect-video w-full rounded-xl border-2 border-background/80 bg-foreground object-cover shadow-lg',
          !cameraOn && 'invisible',
        )}
      />
      {!cameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-background/80 bg-foreground/90 p-3 text-center text-background shadow-lg">
          <VideoOff className="size-5 text-primary" aria-hidden="true" />
          <p className="font-heading text-xs">Your partner's camera is off</p>
        </div>
      )}
    </div>
  )
}
