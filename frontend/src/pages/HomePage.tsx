import { Button } from '@/components/ui/button'
import { CozyRoom } from '@/components/CozyRoom'
import { ArrowUpRight, Moon } from 'lucide-react'
import { createAndJoinRoom } from '@/rooms'

/** The landing page: what the app is, and a button to create a room. */
export function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <span className="font-heading text-xl font-bold">
          popcorn for <span className="text-primary">two</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 font-heading text-xs">
          <Moon className="size-3.5 text-primary" aria-hidden="true" />
          movie night
        </span>
      </header>
      <section className="grid flex-1 items-center gap-4 py-8 lg:grid-cols-[2fr_3fr]">
        <div>
          <p className="font-heading text-xs tracking-widest text-primary uppercase">
            a cozy little room for
          </p>
          <h1 className="mt-3 font-heading text-5xl leading-tight font-bold lg:text-6xl">
            movie night,
            <br />
            <span className="text-primary">together.</span>
          </h1>
          <p className="mt-4 max-w-sm font-heading text-lg text-muted-foreground">
            Watch YouTube in sync with your person, wherever they are.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-8 h-11 px-6 font-heading text-base"
            onClick={createAndJoinRoom}
          >
            Create room
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
        <CozyRoom className="-mx-6 w-[calc(100%+3rem)] lg:mx-0 lg:w-full" />
      </section>
    </main>
  )
}
