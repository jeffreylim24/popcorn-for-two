import { useState, type ReactNode } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Minimize,
  Video,
  VideoOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { micLabel } from '@/mic'
import { cn } from '@/lib/utils'

type FullscreenControlsProps = {
  cameraOn: boolean
  onToggleCamera: () => void
  micError: 'denied' | 'unavailable' | null
  micOn: boolean
  onToggleMic: () => void
  camsHidden: boolean
  onToggleCams: () => void
  onExit: () => void
}

type IconButtonProps = {
  /** Read out by screen readers and shown as the hover tooltip. */
  label: string
  onClick: () => void
  pressed?: boolean
  disabled?: boolean
  children: ReactNode
}

/** A round, icon-only button for the fullscreen bar. */
function IconButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: IconButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="rounded-full"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

/**
 * The control strip's camera, mic and cams buttons, for fullscreen (the
 * strip isn't in it). A chevron at the top centre drops them down.
 * Hand-made, not a shadcn dropdown: that draws its menu in document.body,
 * outside the fullscreen element, where it can't be seen.
 */
export function FullscreenControls({
  cameraOn,
  onToggleCamera,
  micError,
  micOn,
  onToggleMic,
  camsHidden,
  onToggleCams,
  onExit,
}: FullscreenControlsProps) {
  /** Is the bar dropped down? Starts closed: the movie comes first. */
  const [open, setOpen] = useState(false)

  return (
    <div
      className={cn(
        'absolute top-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity',
        // Closed: faint over the movie until you reach for it.
        !open && 'opacity-40 focus-within:opacity-100 hover:opacity-100',
      )}
    >
      <IconButton
        label={open ? 'Hide controls' : 'Show controls'}
        onClick={() => setOpen((o) => !o)}
        pressed={open}
      >
        {open ? (
          <ChevronUp aria-hidden="true" />
        ) : (
          <ChevronDown aria-hidden="true" />
        )}
      </IconButton>
      {open && (
        <div className="flex gap-2 rounded-full bg-foreground/60 p-1.5 shadow-lg">
          <IconButton
            label={micLabel(micError, micOn)}
            onClick={onToggleMic}
            pressed={micOn}
            // Nothing to mute without a mic.
            disabled={micError !== null}
          >
            {micOn && !micError ? (
              <Mic aria-hidden="true" />
            ) : (
              <MicOff aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            label={cameraOn ? 'Camera on' : 'Camera off'}
            onClick={onToggleCamera}
            pressed={cameraOn}
          >
            {cameraOn ? (
              <Video aria-hidden="true" />
            ) : (
              <VideoOff aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            label={camsHidden ? 'Cams hidden' : 'Cams shown'}
            onClick={onToggleCams}
            pressed={camsHidden}
          >
            {camsHidden ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </IconButton>
          <IconButton label="Exit fullscreen" onClick={onExit}>
            <Minimize aria-hidden="true" />
          </IconButton>
        </div>
      )}
    </div>
  )
}
