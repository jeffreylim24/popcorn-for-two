import { useRef, type PointerEvent, type ReactNode } from 'react'

/**
 * The cam box as fractions of the window: x and y are its top-left corner.
 * No height: the box is 16:9, so the browser works it out from the width.
 */
export type CamBox = { x: number; y: number; width: number }

/** `value`, pulled into the range `min`..`max`. */
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/**
 * True once the button is up. Catches a release outside the browser window,
 * where Chrome may never send pointerup: the next move back in ends the drag.
 */
const noButtonHeld = (e: PointerEvent) => e.buttons === 0

type DraggableCamProps = {
  /** Where the box is and how wide. The parent owns it. */
  box: CamBox
  /** Called with the whole new box on every drag or resize move. */
  onBoxChange: (box: CamBox) => void
  /** Show the resize handle only when the child actually draws a box. */
  showHandle: boolean
  /** The cam itself, e.g. SelfView or PartnerView. */
  children: ReactNode
}

/**
 * A box the user can drag and resize. Controlled: it holds no position of its
 * own, so the parent can keep the box while the cam is off (and later sync it).
 */
export function DraggableCam({
  box,
  onBoxChange,
  showHandle,
  children,
}: DraggableCamProps) {
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
      boxX: box.x,
      boxY: box.y,
    }
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (noButtonHeld(e)) {
      dragRef.current = null
      return
    }
    const { innerWidth, innerHeight } = window
    // Measured, not worked out from 16:9: the "camera blocked" box isn't 16:9.
    const rect = e.currentTarget.getBoundingClientRect()
    const left = drag.boxX * innerWidth + (e.clientX - drag.pointerX)
    const top = drag.boxY * innerHeight + (e.clientY - drag.pointerY)
    onBoxChange({
      ...box,
      x: clamp(left, 0, innerWidth - rect.width) / innerWidth,
      y: clamp(top, 0, innerHeight - rect.height) / innerHeight,
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
    resizeRef.current = { pointerX: e.clientX, boxWidth: box.width }
  }

  const handleResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current
    if (!resize) return
    if (noButtonHeld(e)) {
      resizeRef.current = null
      return
    }
    const { innerWidth, innerHeight } = window
    const width = resize.boxWidth * innerWidth + (e.clientX - resize.pointerX)
    const roomRight = (1 - box.x) * innerWidth
    const roomBelow = innerHeight - box.y * innerHeight
    const maxWidth = Math.min(roomRight, (roomBelow * 16) / 9)
    const minWidth = 0.1 * innerWidth
    onBoxChange({
      ...box,
      width: clamp(width, minWidth, maxWidth) / innerWidth,
    })
  }

  const handleResizeUp = () => {
    resizeRef.current = null
  }

  return (
    <div
      className="group fixed z-10 cursor-grab touch-none select-none active:cursor-grabbing"
      style={{
        left: `${box.x * 100}vw`,
        top: `${box.y * 100}vh`,
        width: `${box.width * 100}vw`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      // Capture ends for any reason (release, cancelled touch, window lost
      // focus): end the drag too, in case pointerup never comes.
      onLostPointerCapture={handlePointerUp}
    >
      {children}
      {showHandle && (
        <div
          aria-hidden="true"
          className="absolute right-0 bottom-0 size-6 cursor-nwse-resize p-1.5 pointer-coarse:size-8 pointer-coarse:p-2"
          onPointerDown={handleResizeDown}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          onLostPointerCapture={handleResizeUp}
        >
          {/* A thin corner bracket, shown on hover (always on touch screens, which have no hover); the padding keeps the grab area bigger than what's drawn. */}
          <div className="size-full rounded-br-md border-r-2 border-b-2 border-background/90 opacity-0 transition-opacity group-hover:opacity-100 pointer-coarse:opacity-100" />
        </div>
      )}
    </div>
  )
}
