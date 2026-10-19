import { MicOff } from 'lucide-react'

type MutedBadgeProps = {
  /** Whose mic it is, for screen readers ("You are muted"). */
  who: string
}

/**
 * A small "mic off" circle in a cam's bottom-left corner (the resize handle
 * has the bottom-right). Put it inside a positioned box, like DraggableCam.
 */
export function MutedBadge({ who }: MutedBadgeProps) {
  return (
    <span
      role="img"
      aria-label={`${who} muted`}
      className="pointer-events-none absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-foreground/80 text-background shadow-md"
    >
      <MicOff className="size-4" aria-hidden="true" />
    </span>
  )
}
