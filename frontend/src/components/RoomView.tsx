import { useRef, useState } from 'react'
import { useRoomSocket, type RoomStatus } from '@/hooks/useRoomSocket'
import { useSync } from '@/hooks/useSync'
import { useCall } from '@/hooks/useCall'
import { useFullscreen } from '@/hooks/useFullscreen'
import { Popcorn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createAndJoinRoom } from '@/rooms'
import { SelfView } from '@/components/SelfView'
import { PartnerView } from '@/components/PartnerView'
import { VideoPicker } from '@/components/VideoPicker'
import { CopyLinkButton } from '@/components/CopyLinkButton'
import { DraggableCam, type CamBox } from '@/components/DraggableCam'
import { MutedBadge } from '@/components/MutedBadge'
import { FullscreenControls } from '@/components/FullscreenControls'
import { RoomControls } from '@/components/RoomControls'
import { cn } from '@/lib/utils'

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

type RoomViewProps = {
  code: string
  camStream: MediaStream | null
  micStream: MediaStream | null
  cameraError: 'denied' | 'unavailable' | null
  cameraOn: boolean
  onToggleCamera: () => void
  micError: 'denied' | 'unavailable' | null
  micOn: boolean
  onToggleMic: () => void
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
  cameraError,
  cameraOn,
  onToggleCamera,
  micError,
  micOn,
  onToggleMic,
}: RoomViewProps) {
  const socket = useRoomSocket(code)
  const { status, reconnect } = socket
  const { pickVideo } = useSync(socket, 'player', VIDEO_ID)
  const videoTrack = camStream?.getVideoTracks()[0] ?? null
  const audioTrack = micStream?.getAudioTracks()[0] ?? null
  /** Can the partner hear me? Only with the button on and a mic to send. */
  const micLive = micOn && audioTrack !== null
  const { partnerStream, partnerCameraOn, partnerMicOn } = useCall(
    socket,
    videoTrack,
    audioTrack,
    micLive,
  )
  /** SelfView draws a box: my stream, or the "camera blocked" card. */
  const selfBoxShown = camStream !== null || cameraError === 'denied'
  const statusText = STATUS_TEXT[status]
  /** The player and both cams: what goes fullscreen, so the cams stay on top. */
  const stageRef = useRef<HTMLDivElement | null>(null)
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRef)
  /**
   * Hides both cams on my screen only, for a clear view of the movie.
   * The partner still sees me: the camera keeps sending.
   */
  const [camsHidden, setCamsHidden] = useState(false)
  /** Shared by the header button and the fullscreen bar. */
  const toggleCams = () => setCamsHidden((hidden) => !hidden)
  // Live here, not in the cams: SelfView and PartnerView draw nothing when
  // there's no stream, and the box should keep its place until it's back.
  /** My cam's box. Starts top-left. */
  const [selfBox, setSelfBox] = useState<CamBox>({
    x: 0.02,
    y: 0.1,
    width: 0.2,
  })
  /** The partner's box. Starts top-right: x = 1 - 0.02 margin - 0.2 width. */
  const [partnerBox, setPartnerBox] = useState<CamBox>({
    x: 0.78,
    y: 0.1,
    width: 0.2,
  })

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <a href="/" className="font-heading text-xl font-bold">
          popcorn for <span className="text-primary">two</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="flex h-7 items-center gap-1.5 rounded-full border border-primary/30 px-3 font-heading text-xs">
            <Popcorn className="size-3.5 text-primary" aria-hidden="true" />
            room {code}
          </span>
          <CopyLinkButton />
        </div>
      </header>
      <section className="flex flex-1 flex-col justify-center gap-4 py-8">
        {/* The screen and its control strip, one object like an old TV. */}
        <div className="rounded-2xl shadow-xl">
          <div ref={stageRef} className={cn(isFullscreen && 'bg-foreground')}>
            {/* YouTube replaces #player with an iframe, so the wrapper does the sizing. */}
            <div
              className={cn(
                'relative w-full overflow-hidden bg-foreground [&>iframe]:size-full',
                // Fullscreen: fill the screen; YouTube letterboxes the video itself.
                isFullscreen
                  ? 'h-full'
                  : 'aspect-video rounded-t-2xl border-4 border-b-0 border-foreground/90',
              )}
            >
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
            {/* Outside the player wrapper: its overflow-hidden would clip the box.
            Inside the stage: fullscreen shows only the stage, and the cams
            must come along. Hidden, not removed: the partner's voice keeps
            playing, and each box keeps its place for when the cams come back. */}
            <div hidden={camsHidden}>
              <DraggableCam
                box={selfBox}
                onBoxChange={setSelfBox}
                // Only when there's a box to resize (SelfView draws nothing otherwise).
                showHandle={selfBoxShown}
              >
                <SelfView
                  stream={camStream}
                  error={cameraError}
                  className="w-full"
                />
                {selfBoxShown && !micLive && <MutedBadge who="You are" />}
              </DraggableCam>
              <DraggableCam
                box={partnerBox}
                onBoxChange={setPartnerBox}
                // PartnerView draws nothing until the partner's stream arrives.
                showHandle={partnerStream !== null}
              >
                <PartnerView
                  stream={partnerStream}
                  cameraOn={partnerCameraOn}
                  className="w-full"
                />
                {partnerStream !== null && !partnerMicOn && (
                  <MutedBadge who="Your partner is" />
                )}
              </DraggableCam>
            </div>
            {/* The header isn't in fullscreen, so its buttons and the way out
              live here (Esc works too). */}
            {isFullscreen && (
              <FullscreenControls
                cameraOn={cameraOn}
                onToggleCamera={onToggleCamera}
                micError={micError}
                micOn={micOn}
                onToggleMic={onToggleMic}
                camsHidden={camsHidden}
                onToggleCams={toggleCams}
                onExit={toggleFullscreen}
              />
            )}
          </div>
          <RoomControls
            cameraOn={cameraOn}
            onToggleCamera={onToggleCamera}
            micError={micError}
            micOn={micOn}
            onToggleMic={onToggleMic}
            camsHidden={camsHidden}
            onToggleCams={toggleCams}
            onFullscreen={toggleFullscreen}
          />
        </div>
        <VideoPicker onPick={pickVideo} />
        {/* Last, so the picker doesn't jump when it goes away. */}
        {status === 'connected' && partnerStream === null && (
          <p className="text-center font-heading text-sm text-muted-foreground">
            Waiting for your partner. Copy the link and send it to them.
          </p>
        )}
      </section>
    </main>
  )
}
