# Learning Snapshot

_Last updated: 2026-10-04 (session 1)_

## Concepts

### Shaky
- **Writing a commit subject from scratch:** knows the rules, but got stuck naming a change ("update" is too vague) and asked for the message.
  - Tried: the "This commit…" trick (say it in plain words, then trim it to an imperative verb and an object).
  - Next: have the user draft subjects for real project commits and review them. Ask what the change *does* before suggesting wording.

### Solid
- Git's four areas (working dir → staging → local repo → remote) and reading `git status -sb` (`[ahead N]`). Moved here after two correct predictions.
- Commit messages: imperative, ~50-char subject, blank line, body for the *why*; multi-line via plain `git commit` (editor) or several `-m` flags
- One logical change per commit: group by "these belong together", not by size
- Selective staging: `git add <file>` instead of `git add .`; `git commit <path>` commits only that path
- Conventional Commits: `type: lowercase description` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`)
- Checking a push: `git status -sb`, `git log --oneline`, `git show --stat HEAD`, `git fetch`; upstream tracking

## Decisions

- **React + TypeScript + Vite** frontend. Vite is the standard dev server and bundler for plain React. Next.js would overlap with the Go backend.
- **shadcn/ui + Tailwind**, not MUI. Owning the component source suits a custom look and unusual UI (draggable facecams). Cost: learning Tailwind.
- **Bun**, not npm, as the package manager. It's familiar and fast. Docs' `npm`/`npx` commands become `bun add`/`bunx`.
- **Go** backend. It handles many concurrent connections well, which suits WebSockets.
- **Conventional Commits** for commit style. It keeps history consistent and scannable.
- **LEARNING.md is a snapshot**, not a diary. This keeps startup tokens low and stops the same explanations from repeating.
- **Claude commits LEARNING.md at wrap-up** with a fixed message, without pushing. This keeps project commits focused and saves the user writing a routine message.

## Open questions

- The bigger product vision (mini-games, movies) gets its own brainstorming session.

## Teaching formats

- Works: comparison tables for choices; reviewing the user's own drafts; prediction questions (they surfaced a gap, then confirmed it was fixed).
- The user questions the design of their tools and process (the size of this file, what belongs in commit messages). Engage with the reasoning; don't just give answers.
- Untested: analogies, runnable examples.

## Next step

Plan the MVP's first milestone and set up the project skeleton. Start by discussing the repo layout (monorepo with `frontend/` and `backend/`?) and *why*, before any commands.
