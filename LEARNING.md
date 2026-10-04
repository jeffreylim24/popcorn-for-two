# Learning Log

## Concepts learned

_None yet._

## Decisions

- **2026-10-04: Frontend is React + TypeScript + Vite.** Vite is the standard dev server and bundler for a plain React app. We didn't pick Next.js because it bundles its own server, which would overlap with the Go backend.
- **2026-10-04: UI library is shadcn/ui + Tailwind (not MUI).** shadcn copies component source into the project, so it can be read and customized. That suits the custom "date night" look and unusual UI like draggable facecams. Tradeoff: Tailwind basics have to be learned.
- **2026-10-04: Package manager is Bun (not npm).** It's familiar from a past project and fast. Bun is only used to install packages and run scripts; Go is the backend. Tradeoff: docs show `npm`/`npx` commands, which become `bun add`/`bunx`.
- **2026-10-04: Backend is Go.** It handles many concurrent connections well, which suits WebSockets.

## Open questions

- Which teaching formats work best (analogies, diagrams, examples, docs)? Try them and note here.
- The bigger product vision (mini-games, movies) will be brainstormed in a separate session.

## What worked (teaching style)

_Not yet known._

## Next step

Plan the MVP's first milestone and set up the project skeleton (frontend + backend folders).
