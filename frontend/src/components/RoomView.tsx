import { useRef, useState, type PointerEvent } from 'react'
import { useRoomSocket, type RoomStatus } from '@/hooks/useRoomSocket'
import { useSync } from '@/hooks/useSync'
import { useCall } from '@/hooks/useCall'
import { Popcorn, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createAndJoinRoom } from '@/rooms'
import { SelfView } from '@/components/SelfView'
import { PartnerView } from '@/components/PartnerView'
import { VideoPicker } from '@/components/VideoPicker'
import { CopyLinkButton } from '@/components/CopyLinkButton'

/** Dummy video ID for testing. */
const VIDEO_ID = 'kzcI5F4tGiU'

/** Record forces an entry per status, so a new status can't be forgotten here. */
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

/**
 * The cam box as fractions of the window: x and y are its top-left corner.
 * No height: the box is 16:9, so the browser works it out from the width.
 */
type CamBox = { x: number; y: number; width: number }

/** `value`, pulled into the range `min`..`max`. */
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

type RoomViewProps = {
  code: string
  camStream: MediaStream | null
  micStream: MediaStream | null
  error: 'denied' | 'unavailable' | null
  cameraOn: boolean
  onToggleCamera: () => void
}

/**
 * The room after Join. The socket lives here, not in RoomPage, so it opens
 * only once this mounts (and #player exists by then). Hooks that need it
 * (useSync, later the call) get it from here.
 */
export function RoomView({
  code,
  camStream,
  micStream,
  error,
  cameraOn,
  onToggleCamera,
}: RoomViewProps) {
  const socket = useRoomSocket(code)
  const { status, reconnect } = socket
  const { pickVideo } = useSync(socket, 'player', VIDEO_ID)
  const videoTrack = camStream?.getVideoTracks()[0] ?? null
  const audioTrack = micStream?.getAudioTracks()[0] ?? null
  const partnerStream = useCall(socket, videoTrack, audioTrack)
  const statusText = STATUS_TEXT[status]
  // Lives here, not in SelfView: SelfView unmounts when the camera is off.
  const [camBox, setCamBox] = useState<CamBox>({ x: 0.02, y: 0.1, width: 0.2 })
  /**
   * Where the pointer (px) and the cam (fractions) were at pointerdown.
   * null = no drag in progress, so moves while hovering do nothing.
   */
  const dragRef = useRef<{
    pointerX: number
    pointerY: number
    boxX: number
    boxY: number
  } | null>(null)

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Every move goes to this box until release, even over the YouTube iframe.
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      boxX: camBox.x,
      boxY: camBox.y,
    }
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const { innerWidth, innerHeight } = window
    // Measured, not worked out from 16:9: the "camera blocked" box isn't 16:9.
    const box = e.currentTarget.getBoundingClientRect()
    const left = drag.boxX * innerWidth + (e.clientX - drag.pointerX)
    const top = drag.boxY * innerHeight + (e.clientY - drag.pointerY)
    setCamBox({
      ...camBox,
      x: clamp(left, 0, innerWidth - box.width) / innerWidth,
      y: clamp(top, 0, innerHeight - box.height) / innerHeight,
    })
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  /**
   * Where the pointer (px) was and the cam's width (fraction) at pointerdown
   * on the resize handle. null = not resizing.
   */
  const resizeRef = useRef<{ pointerX: number; boxWidth: number } | null>(null)

  const handleResizeDown = (e: PointerEvent<HTMLDivElement>) => {
    // Stop here, or the wrapper's handlePointerDown starts a drag too.
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { pointerX: e.clientX, boxWidth: camBox.width }
  }

  const handleResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current
    if (!resize) return
    const { innerWidth, innerHeight } = window
    const width = resize.boxWidth * innerWidth + (e.clientX - resize.pointerX)
    const roomRight = (1 - camBox.x) * innerWidth
    const roomBelow = innerHeight - camBox.y * innerHeight
    const maxWidth = Math.min(roomRight, (roomBelow * 16) / 9)
    const minWidth = 0.1 * innerWidth
    setCamBox({
      ...camBox,
      width: clamp(width, minWidth, maxWidth) / innerWidth,
    })
  }

  const handleResizeUp = () => {
    resizeRef.current = null
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <a href="/" className="font-heading text-xl font-bold">
          popcorn for <span className="text-primary">two</span>
        </a>
        <div className="flex items-center gap-2">
          <CopyLinkButton />
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
      {/* Outside the player wrapper: its overflow-hidden would clip the box. */}
      <div
        className="group fixed z-10 cursor-grab touch-none select-none active:cursor-grabbing"
        style={{
          left: `${camBox.x * 100}vw`,
          top: `${camBox.y * 100}vh`,
          width: `${camBox.width * 100}vw`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <SelfView stream={camStream} error={error} className="w-full" />
        {/* Only when there's a box to resize (SelfView draws nothing otherwise). */}
        {(camStream || error === 'denied') && (
          <div
            aria-hidden="true"
            className="absolute right-0 bottom-0 size-6 cursor-nwse-resize p-1.5"
            onPointerDown={handleResizeDown}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
          >
            {/* A thin corner bracket, shown on hover; the padding keeps the grab area bigger than what's drawn. */}
            <div className="size-full rounded-br-md border-r-2 border-b-2 border-background/90 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        )}
      </div>
      {/* Top-right, mirroring the self cam's start. Fixed for now. */}
      <PartnerView
        stream={partnerStream}
        className="fixed top-[10vh] right-[2vw] z-10 w-[20vw]"
      />
    </main>
  )
}
