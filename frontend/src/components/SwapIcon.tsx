import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

type SwapIconProps = {
  /** Names the icon showing now (e.g. 'on' / 'off'). A new id plays the swap. */
  id: string
  children: ReactNode
}

/**
 * Wraps a toggle's icon so a change shrinks the old one out and pops the new
 * one in, showing what changed. `initial={false}`: no animation on first
 * render, only on a swap.
 */
export function SwapIcon({ id, children }: SwapIconProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={id}
        className="inline-flex"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.12 }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  )
}
