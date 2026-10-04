# Learning Snapshot

_Last updated: 2026-10-04 (session 2)_

## Concepts

### Shaky
- **Writing a commit subject from scratch:** improving. Session 2: first draft had "setup" (noun) for "set up" and a vague "template"; second draft was clean with no help.
  - Next: one more clean, unaided draft and it moves to Solid.
- **Go (the language):** treat as new. Built a Go app before, but AI wrote most of it, so little stuck.
- **Verifying what a commit contains:** reached for `git status` (shows *that* a commit exists) instead of `git show --stat HEAD` (shows *what's in it*). Pick the command that answers the actual question.

### Learning (introduced, explained back correctly once)
- **`package main` / `func main()`:** `main` is a special package name meaning "build an executable"; `func main` is the program's entry point (the whole package, not one file). The program exits when `main` returns.
- **`net/http` basics:** handler signature `(w http.ResponseWriter, r *http.Request)`; method+path patterns (`"GET /health"`); `ListenAndServe` blocks forever and only returns an error; wrap it in `log.Fatal`.
- **CORS / same-origin policy:** origin = scheme + host + port. The browser lets a page send cross-origin requests but blocks JS from reading the response without `Access-Control-Allow-Origin`. Enforced by browsers only (curl works), so it protects users, not the API.
- **Message contract:** frontend and backend must agree on the exact shape of sync messages. A mismatch fails silently (Go's JSON decoding ignores unknown fields and zero-fills missing ones).

### Solid
- Git's four areas (working dir → staging → local repo → remote) and reading `git status -sb` (`[ahead N]`)
- Commit messages: imperative, ~50-char subject, blank line, body for the *why*; multi-line via plain `git commit` (editor) or several `-m` flags
- One logical change per commit: group by "these belong together", not by size
- Selective staging: `git add <file>` instead of `git add .`; `git commit <path>` commits only that path
- Conventional Commits: `type: lowercase description`; `chore` for setup work, `feat` for user-facing features
- Checking a push: `git status -sb`, `git log --oneline`, `git show --stat HEAD`, `git fetch`; upstream tracking
- `.gitignore` applies to its own folder and below; `node_modules` is ignored (rebuilt by `bun install`), `bun.lock` is committed
- `go.mod`: module path (a name, not a URL; no `https://`), `go` line = minimum Go version; `go.sum` ≈ `bun.lock`
- Toolchains (Go, Bun, Node: per machine, update yourself) vs project deps (per project, pinned in the lockfile)

## Decisions

- **React + TypeScript + Vite** frontend. Vite is the standard dev server and bundler for plain React. Next.js would overlap with the Go backend.
- **shadcn/ui + Tailwind**, not MUI. Owning the component source suits a custom look and unusual UI (draggable facecams).
- **Bun**, not npm. Docs' `npm`/`npx` commands become `bun add`/`bunx`.
- **Go** backend. It handles many concurrent connections well, which suits WebSockets.
- **Conventional Commits** for commit style. It keeps history consistent and scannable.
- **Monorepo: `frontend/` + `backend/`.** One commit can change both sides of a message contract, and the project docs live in one place.
- **Plain React + TS, no React Compiler.** Seeing re-renders is part of learning frontend logic. Easy to add later.
- **ESLint, not Oxlint.** Far more written help when a rule is confusing; speed doesn't matter at this size.
- **Flat Go layout (`backend/main.go`).** One program; move to `cmd/` only if there are several.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26 (LTS line). Updated at project start, while nothing depends on versions.
- **Ports:** Vite on 5173, Go on 8080.
- **Vite dev proxy, not CORS headers.** One origin in the browser, matching the likely production setup. All API routes live under `/api/`.
- **Commit straight to `main`** for now. Branches and PRs come later, when there's a reason.
- **LEARNING.md is a snapshot**, committed by Claude at wrap-up with a fixed message, without pushing.

## Open questions

- The bigger product vision (mini-games, movies) gets its own brainstorming session.
- Production shape: Go serves the built frontend (one origin) vs separate hosting (needs CORS). Decide at deployment.

## Teaching formats

- Works: comparison tables for choices; reviewing the user's own drafts; ASCII flow diagrams (message flow, request flow, proxy); concrete scenarios.
- Works: "explain it back in your own words" after running something.
- Doesn't work: abstract questions (rephrase as a concrete scenario with a diagram).
- **Don't:** ask the user to predict command output. It isn't how real work goes; ask them to explain the real output instead.
- **Don't:** send the user to docs to learn a step. Explain inline; links go at the end as optional extras.
- The user questions the design of their tools and process. Engage with the reasoning.
- Untested: analogies, runnable examples.

## Next step

**Step 8: Vite dev proxy.** Nothing started yet.
1. Backend: change the route in `backend/main.go` from `"GET /health"` to `"GET /api/health"`.
2. Frontend: in `frontend/vite.config.ts`, add `server.proxy` with `'/api'` → `'http://localhost:8080'`.
3. Restart both servers. In the Chrome console on `localhost:5173`, run `fetch('/api/health').then(r => r.text()).then(console.log)`: health message, no CORS error. The Network tab shows the URL on `localhost:5173`.
4. Commit (user drafts the message).

Then: have React fetch `/api/health` and show it on the page (`useState` + `useEffect`), which completes the walking skeleton. After that, plan the MVP milestones.
