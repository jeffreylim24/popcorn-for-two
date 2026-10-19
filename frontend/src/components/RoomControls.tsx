import type { ReactNode } from 'react'
import {
  Eye,
  EyeOff,
  Maximize,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from 'lucide-react'
import { micLabel } from '@/mic'
import { cn } from '@/lib/utils'

type RoomControlsProps = {
  cameraOn: boolean
  onToggleCamera: () => void
  micError: 'denied' | 'unavailable' | null
  micOn: boolean
  onToggleMic: () => void
  camsHidden: boolean
  onToggleCams: () => void
  onFullscreen: () => void
}

type ControlButtonProps = {
  label: string
  icon: ReactNode
  onClick: () => void
  /** Draws the button in the accent: "this is off", seen at a glance. */
  alert?: boolean
  pressed?: boolean
  disabled?: boolean
}

/** One button on the strip. The label hides on narrow screens; the icon stays. */
function ControlButton({
  label,
  icon,
  onClick,
  alert,
  pressed,
  disabled,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      disabled={disabled}
      title={label}
      className={cn(
        'flex h-9 items-center gap-2 rounded-full px-3 font-heading text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-foreground disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        alert
          ? 'bg-primary text-primary-foreground hover:bg-primary/85'
          : 'text-background hover:bg-background/15',
      )}
    >
      {icon}
      <span className="max-sm:sr-only">{label}</span>
    </button>
  )
}

/**
 * The strip under the player, like the panel on an old TV: your mic and
 * camera on the left, the screen's own controls on the right.
 */
export function RoomControls({
  cameraOn,
  onToggleCamera,
  micError,
  micOn,
  onToggleMic,
  camsHidden,
  onToggleCams,
  onFullscreen,
}: RoomControlsProps) {
  const micLive = micOn && !micError

  return (
    <div className="flex items-center justify-between gap-2 rounded-b-2xl bg-foreground/90 px-2 py-2 sm:px-3">
      <div className="flex items-center gap-1">
        <ControlButton
          label={micLabel(micError, micOn)}
          icon={
            micLive ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />
          }
          onClick={onToggleMic}
          alert={!micLive}
          pressed={micOn}
          // Nothing to mute without a mic.
          disabled={micError !== null}
        />
        <ControlButton
          label={cameraOn ? 'Camera on' : 'Camera off'}
          icon={
            cameraOn ? (
              <Video aria-hidden="true" />
            ) : (
              <VideoOff aria-hidden="true" />
            )
          }
          onClick={onToggleCamera}
          alert={!cameraOn}
          pressed={cameraOn}
        />
      </div>
      <div className="flex items-center gap-1">
        <ControlButton
          label={camsHidden ? 'Cams hidden' : 'Cams shown'}
          icon={
            camsHidden ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )
          }
          onClick={onToggleCams}
          pressed={camsHidden}
        />
        <ControlButton
          label="Fullscreen"
          icon={<Maximize aria-hidden="true" />}
          onClick={onFullscreen}
        />
      </div>
    </div>
  )
}
