import { useState, type FormEvent } from 'react'
import { Clapperboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

type VideoPickerProps = {
  /**
   * Called with the pasted link. Returns false if it isn't a YouTube video,
   * so the form can say so.
   */
  onPick: (link: string) => boolean
}

/** The box under the player for pasting a YouTube link. */
export function VideoPicker({ onPick }: VideoPickerProps) {
  const [link, setLink] = useState('')
  const [invalid, setInvalid] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (onPick(link)) {
      setLink('')
      setInvalid(false)
    } else {
      setInvalid(true)
    }
  }

  return (
    // noValidate: skip Chrome's own "Please enter a URL" bubble, so every bad
    // link gets the same message below.
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="url"
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setInvalid(false)
          }}
          placeholder="Paste a YouTube link"
          aria-label="YouTube link"
          aria-invalid={invalid}
          className="h-11 min-w-0 flex-1 rounded-full border-2 border-foreground/20 bg-background px-5 font-heading text-base outline-none sm:text-sm placeholder:text-muted-foreground focus-visible:border-primary aria-invalid:border-destructive"
        />
        <Button
          type="submit"
          size="lg"
          className="h-11 rounded-full px-6 font-heading text-base"
          disabled={link.trim() === ''}
        >
          <Clapperboard data-icon="inline-start" aria-hidden="true" />
          Watch
        </Button>
      </div>
      {invalid && (
        <p className="px-5 font-heading text-xs text-destructive">
          That doesn't look like a YouTube video link.
        </p>
      )}
    </form>
  )
}
