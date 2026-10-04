# Learning Snapshot

_Last updated: 2026-10-04 (session 1)_

## Concepts

### Shaky
- **Git's four areas** (working dir → staging → local repo → remote): mixed up "staged" with "committed but not pushed" (`[ahead N]`).
  - Tried: ASCII flow diagram, plus a pointer to the Git Book's "Recording Changes" chapter.
  - Progress: correctly predicted `[ahead 1]` between commit and push (second attempt).
  - Next: a harder variant (e.g. edited a file and staged it but haven't committed; or staged one file and left another modified). Move to Solid after one more correct answer.

### Solid
- Commit messages: imperative, ~50-char subject, body for the *why*, one logical change per commit
- Conventional Commits: `type: lowercase description` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`)
- Checking a push: `git status -sb`, `git log --oneline`, `git show --stat HEAD`, `git fetch`; upstream tracking

## Decisions

- **React + TypeScript + Vite** frontend. Vite is the standard dev server and bundler for plain React. Next.js would overlap with the Go backend.
- **shadcn/ui + Tailwind**, not MUI. Owning the component source suits a custom look and unusual UI (draggable facecams). Cost: learning Tailwind.
- **Bun**, not npm, as the package manager. It's familiar and fast. Docs' `npm`/`npx` commands become `bun add`/`bunx`.
- **Go** backend. It handles many concurrent connections well, which suits WebSockets.
- **Conventional Commits** for commit style. It keeps history consistent and scannable.

## Open questions

- The bigger product vision (mini-games, movies) gets its own brainstorming session.

## Teaching formats

- Works: comparison tables for choices; reviewing the user's own drafts; prediction questions (they surface gaps).
- Untested: analogies, runnable examples.

## Next step

Plan the MVP's first milestone and set up the project skeleton. Start by discussing the repo layout (monorepo with `frontend/` and `backend/`?) and *why*, before any commands.
