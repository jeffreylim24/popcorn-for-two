import { useEffect, useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type PartnerViewProps = {
  /** The partner's camera and mic from the call. Null = no call yet. */
  stream: MediaStream | null
  className?: string
  style?: CSSProperties
}

/** The partner's facecam, with their sound. */
export function PartnerView({ stream, className, style }: PartnerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // No partner on the call: no box at all.
  if (!stream) return null

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      // Not muted: this element plays the partner's voice. Not mirrored
      // either: you see them as they really are. Unmuted autoplay is
      // allowed because clicking Join counts as interacting with the page.
      className={cn(
        'aspect-video rounded-xl border-2 border-background/80 bg-foreground object-cover shadow-lg',
        className,
      )}
      style={style}
    />
  )
}
