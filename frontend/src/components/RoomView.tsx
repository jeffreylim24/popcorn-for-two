import { useState } from 'react'
import { useRoomSocket, type RoomStatus } from '@/hooks/useRoomSocket'
import { useSync } from '@/hooks/useSync'
import { useCall } from '@/hooks/useCall'
import {
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Popcorn,
  Video,
  VideoOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createAndJoinRoom } from '@/rooms'
import { SelfView } from '@/components/SelfView'
import { PartnerView } from '@/components/PartnerView'
import { VideoPicker } from '@/components/VideoPicker'
import { CopyLinkButton } from '@/components/CopyLinkButton'
import { DraggableCam, type CamBox } from '@/components/DraggableCam'
import { micLabel } from '@/mic'

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
  const { partnerStream, partnerCameraOn } = useCall(
    socket,
    videoTrack,
    audioTrack,
  )
  const statusText = STATUS_TEXT[status]
  /**
   * Hides both cams on my screen only, for a clear view of the movie.
   * The partner still sees me: the camera keeps sending.
   */
  const [camsHidden, setCamsHidden] = useState(false)
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full font-heading text-xs"
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
            size="sm"
            variant="outline"
            className="rounded-full font-heading text-xs"
            onClick={() => setCamsHidden((hidden) => !hidden)}
            aria-pressed={camsHidden}
          >
            {camsHidden ? (
              <EyeOff data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Eye data-icon="inline-start" aria-hidden="true" />
            )}
            {camsHidden ? 'Cams hidden' : 'Cams shown'}
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
      {/* Outside the player wrapper: its overflow-hidden would clip the box.
          Hidden, not removed: the partner's voice keeps playing, and each box
          keeps its place for when the cams come back. */}
      <div hidden={camsHidden}>
        <DraggableCam
          box={selfBox}
          onBoxChange={setSelfBox}
          // Only when there's a box to resize (SelfView draws nothing otherwise).
          showHandle={camStream !== null || cameraError === 'denied'}
        >
          <SelfView stream={camStream} error={cameraError} className="w-full" />
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
        </DraggableCam>
      </div>
    </main>
  )
}
