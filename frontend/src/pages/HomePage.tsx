import { motion, type Variants } from 'motion/react'
import { Button } from '@/components/ui/button'
import { CozyRoom } from '@/components/CozyRoom'
import { ArrowUpRight, Moon } from 'lucide-react'
import { createAndJoinRoom } from '@/rooms'

/**
 * The entrance for each piece of text: rises a little as it fades in. `custom`
 * is the piece's place in line, so each one starts a beat after the last.
 */
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

/** The scene comes in last and slower, so the text lands first. */
const sceneIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  shown: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.45, duration: 0.8, ease: 'easeOut' },
  },
}

/** The landing page: what the app is, and a button to create a room. */
export function HomePage() {
  return (
    // initial/animate name the variants; every motion child below inherits them.
    <motion.main
      initial="hidden"
      animate="shown"
      className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 py-8"
    >
      <motion.header
        variants={rise}
        custom={0}
        className="flex items-center justify-between"
      >
        <span className="font-heading text-xl font-bold">
          popcorn for <span className="text-primary">two</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 font-heading text-xs">
          <Moon className="size-3.5 text-primary" aria-hidden="true" />
          movie night
        </span>
      </motion.header>
      <section className="grid flex-1 items-center gap-4 py-8 lg:grid-cols-[2fr_3fr]">
        <div>
          <motion.p
            variants={rise}
            custom={1}
            className="font-heading text-xs tracking-widest text-primary uppercase"
          >
            a cozy little room for
          </motion.p>
          <h1 className="mt-3 font-heading text-5xl leading-tight font-bold lg:text-6xl">
            <motion.span variants={rise} custom={2} className="block">
              movie night,
            </motion.span>
            <motion.span
              variants={rise}
              custom={3}
              className="block text-primary"
            >
              together.
            </motion.span>
          </h1>
          <motion.p
            variants={rise}
            custom={4}
            className="mt-4 max-w-sm font-heading text-lg text-muted-foreground"
          >
            Watch YouTube in sync with your person, wherever they are.
          </motion.p>
          <motion.div variants={rise} custom={5}>
            <Button
              type="button"
              size="lg"
              className="mt-8 h-11 px-6 font-heading text-base"
              onClick={createAndJoinRoom}
            >
              Create room
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </motion.div>
        </div>
        {/* Negative margin on the wrapper: on phones the scene bleeds to the window's edges. */}
        <motion.div variants={sceneIn} className="-mx-6 lg:mx-0">
          <CozyRoom className="w-full" />
        </motion.div>
      </section>
    </motion.main>
  )
}
