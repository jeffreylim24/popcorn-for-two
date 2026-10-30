import { useEffect, useState } from 'react'
import { Check, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SwapIcon } from '@/components/SwapIcon'

/** How long the button says "Copied!" before it switches back. */
const COPIED_FOR_MS = 2000

/** Copies the room's URL: the link you send your partner so they can join. */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  // Flip back to "Copy link" after a moment; the cleanup cancels the timer
  // if the button unmounts first.
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch (err) {
      console.error('Could not copy the room link:', err)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="rounded-full font-heading text-xs"
      onClick={handleClick}
    >
      <SwapIcon id={copied ? 'copied' : 'link'}>
        {copied ? (
          <Check data-icon="inline-start" aria-hidden="true" />
        ) : (
          <Link data-icon="inline-start" aria-hidden="true" />
        )}
      </SwapIcon>
      {copied ? 'Copied!' : 'Copy link'}
    </Button>
  )
}
