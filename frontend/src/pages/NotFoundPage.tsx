import { Button } from '@/components/ui/button'
import { ArrowLeft, Clapperboard } from 'lucide-react'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <a href="/" className="font-heading text-xl font-bold">
          popcorn for <span className="text-primary">two</span>
        </a>
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
        <Clapperboard className="size-12 text-primary" aria-hidden="true" />
        <p className="font-heading text-xs tracking-widest text-primary uppercase">
          404
        </p>
        <h1 className="font-heading text-4xl font-bold lg:text-5xl">
          page not found
        </h1>
        <p className="max-w-sm font-heading text-lg text-muted-foreground">
          This scene got cut. Check the link, or head back home to start a new
          room.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-4 h-11 px-6 font-heading text-base"
        >
          <a href="/">
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Back home
          </a>
        </Button>
      </section>
    </main>
  )
}
