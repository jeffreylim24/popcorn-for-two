import { useSync } from '@/hooks/useSync'
import { Popcorn } from 'lucide-react'

// Dummy video ID for testing.
const VIDEO_ID = 'kzcI5F4tGiU'

export function RoomPage({ code }: { code: string }) {
  useSync(code, 'player', VIDEO_ID)

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <a href="/" className="font-heading text-xl font-bold">
          popcorn for <span className="text-primary">two</span>
        </a>
        <span className="flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 font-heading text-xs">
          <Popcorn className="size-3.5 text-primary" aria-hidden="true" />
          room {code}
        </span>
      </header>
      <section className="flex flex-1 flex-col justify-center gap-4 py-8">
        {/* YouTube replaces #player with an iframe, so the wrapper does the sizing. */}
        <div className="aspect-video w-full overflow-hidden rounded-2xl border-4 border-foreground/80 bg-foreground shadow-xl [&>iframe]:size-full">
          <div id="player" />
        </div>
        <p className="text-center font-heading text-sm text-muted-foreground">
          Send this page's link to your person. Play, pause and seek stay in
          sync.
        </p>
      </section>
    </main>
  )
}
