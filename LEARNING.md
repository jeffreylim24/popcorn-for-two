# Learning Snapshot

_Last updated: 2026-10-04 (session 3)_

## Concepts

### Shaky
- **Go (the language):** treat as new. Built a Go app before, but AI wrote most of it, so little stuck.
- **Verifying what a commit contains:** session 3: ran `git log`, then asked for the command (`git show --stat HEAD`). Then pushed before checking. Tried: question → command table (`log --oneline` / `show --stat` / `show`). Used it correctly before the second push.
  - Next: reaches for `git show --stat HEAD` before pushing, unprompted.

### Learning (introduced, explained back correctly once)
- **`package main` / `func main()`:** `main` package = build an executable; `func main` = entry point; program exits when it returns.
- **`net/http` basics:** handler signature `(w, r)`; method+path patterns (`"GET /api/health"`); `ListenAndServe` blocks forever and only returns an error, so it's wrapped in `log.Fatal`. Unmatched routes get Go's default 404.
- **CORS / same-origin policy:** origin = scheme + host + port. The browser blocks JS from reading cross-origin responses without `Access-Control-Allow-Origin`. Browser-only (curl ignores it).
- **Vite dev proxy:** forwards path prefixes (`/api`) to Go. A relative URL resolves against the page's origin; the browser never sees the proxy. At first said the *browser* uses the config; corrected with a two-step diagram. Vite (dev server) ≠ React code.
- **HTTP status line:** `-i` shows status + headers. 200 / 404 / 502 (Bad Gateway = proxy couldn't reach the upstream). Proxies rewrite and add headers: ask "which hop added it?". Use `response.status`, not `statusText` (empty on HTTP/2).
- **`useState`:** first described it as taking a function + deps array (mixed up with other hooks). Fixed with the counter in `App.tsx` + render-cycle diagram. Value + setter; the setter triggers a re-render. Used correctly after.
- **`useEffect`:** runs after render; `[]` = once on mount; return a cleanup function for anything it opens.
- **Promise chains:** each `.then` receives the previous return value. Added `.then(console.log)` and broke the chain (passes `undefined`); fixed with block-form arrow + explicit `return`.
- **fetch errors:** fetch rejects only on *no response*. HTTP errors resolve, so check `response.ok` and `throw` to reach `.catch`. At first thought `setMessage` needed its own `.catch`; one `.catch` covers the whole chain above it.
- **StrictMode double mount:** dev-only mount → unmount → mount to expose missing cleanup. On their own, the user saw that a leaked WebSocket would take the partner's room seat.
- **Message contract:** frontend and backend must agree on the exact message shape; a mismatch fails silently (Go JSON ignores unknown fields, zero-fills missing ones).

### Solid
- Git's four areas and reading `git status -sb` (`[ahead N]`); checking a push (`git fetch`, upstream tracking)
- Commit messages: imperative, ~50-char subject, blank line, body for the *why*. Two clean unaided drafts in session 3, with good `chore` vs `feat` reasoning.
- One logical change per commit; selective staging (`git add <file>`, `git commit <path>`)
- Conventional Commits: `chore` for setup and scaffolding, `feat` for user-facing features
- `.gitignore` scope; `node_modules` ignored, `bun.lock` committed
- `go.mod` (module path is a name, not a URL; `go` line = minimum version); `go.sum` ≈ `bun.lock`
- Toolchains (per machine) vs project deps (per project, lockfile)

## Decisions

- **React + TS + Vite** frontend; Next.js would overlap with the Go backend.
- **shadcn/ui + Tailwind**, not MUI: owning the component source suits the unusual UI (draggable facecams).
- **Bun**, not npm (`npm`/`npx` → `bun add`/`bunx`).
- **Go** backend: handles many concurrent connections well, which suits WebSockets.
- **Conventional Commits** for consistent, scannable history.
- **Monorepo `frontend/` + `backend/`:** one commit can change both sides of a message contract.
- **No React Compiler:** seeing re-renders is part of learning. **ESLint, not Oxlint:** more written help.
- **Flat Go layout (`backend/main.go`)** until there are several programs.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26. **Ports:** Vite 5173, Go 8080.
- **Vite dev proxy, not CORS headers:** one origin in the browser; all API routes under `/api/`. Done in session 3.
- **Commit straight to `main`** for now; branches/PRs when there's a reason.
- **LEARNING.md is a snapshot**, committed by Claude at wrap-up, not pushed.

## Open questions

- Bigger product vision (mini-games, movies) gets its own brainstorming session.
- Production shape: Go serves the built frontend (one origin) vs separate hosting (needs CORS). Decide at deployment.
- Rooms: the server must detect dead connections itself (crashed tabs never send close). Design when building rooms.

## Teaching formats

- Works: ASCII flow diagrams (request flow, proxy hops, render cycle, promise chain); comparison tables; reviewing the user's own drafts.
- Works: "explain it back" after running something. Debugging by investigating (log `status`/`ok`, compare runs) instead of guessing.
- Works: small *unrelated* code examples (block-form arrow, `throw`). The user applied them to their own code correctly.
- Works: concrete scenario questions. The StrictMode scenario led to an unprompted design insight.
- Doesn't work: abstract questions; asking to predict command output; sending to docs to learn a step.
- The user questions the design of their tools and process and sometimes jumps ahead with "where does X go?". Engage with it.
- Tried once, reaction unclear: analogy (StrictMode as a "fire drill").

## Next step

**Plan the MVP milestones** (separate session). The walking skeleton is done: page → React → `/api` proxy → Go → page, with error handling (commit `1cac4f5`).
