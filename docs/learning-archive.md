# Learning archive

Older detail moved out of `LEARNING.md` to keep it under budget.

## Moved 2026-10-15 (session 16): backend concepts from M2

- **Goroutine per connection + blocking `Read`:** two-column timeline fixed it; explained back correctly.
- **Locals declared inside a loop are ~free**; real per-message costs are `msg`'s byte slice and the ctx timer.
- **Errors as values + sentinel errors:** `errors.New`, `errors.Is` (wrapping), catch-all → 1011 last.
- **`defer`:** defer the undo right after the thing succeeds; not inside a long loop. One more correct placement → Solid.
- **Goroutines + `sync.Mutex`:** lock briefly; read under the lock, write outside it. Locks protect the map, not the conn.
- **Who logs an error:** the function that acts on it. **Logging in production:** events, not traffic.
- **App close codes:** 4000–4999 app-defined; 4004 not found, 4005 full; 1011 internal.
- **WebSocket handshake:** GET + `Upgrade` → 101 → two-way. 1000 normal, 1006 abnormal. Vite's own HMR socket (`?token=`) is dev-only noise.
- **Go dependencies:** `go get`, `go.mod` / `go.sum`, `// indirect`, `go mod tidy`.
- **WebSocket heartbeat**, **signaling (WebRTC)**: planning only, no code yet.

## Moved from LEARNING.md (session 17)

- **Log placement vs what actually happened:** a log before the decision printed for skipped sends too, so it looked like B was still sending. DevTools **Network → WS → Messages** (↑ sent / ↓ received) is the real proof.
- **Cross-origin iframe:** the page can't see clicks inside YouTube's player; only API events reach you.
- **JS runs one thing at a time:** no timer tick can land in the middle of a cleanup function (like code on one Java thread).
- **Reading TS overload errors:** skip overloads that never applied; the matching overload's reason is the real error; later errors can be fallout.
- Asks for a code review against "industry standards" now and then: a ranked table (principle, why, when) landed.

## Moved from LEARNING.md (session 19)

- **`never` exhaustive switch:** saw `tsc` flag the `default` after temporarily adding `'ended'`.
- **YouTube replaces the target element:** put the buttons inside `<div id="player">`, and the iframe swap wiped them. Found it from the diff and a guiding question.
- **`git commit --amend`** for an unpushed commit that missed files; every commit should build on its own.
- **Testing a hypothesis with logs:** guessed "seek fires no event", logged every `onStateChange`, found it holds only while paused. Asked "why did it buffer this time?", and then saw it doesn't always.

## Moved from LEARNING.md (session 21)

- **Hook-split review (session 20):** reviewed `7efa953`, `8fba79e`, `666bb94`. A `code` change would leave the new socket without a handler (said "old onmessage"; it's on the closed socket). Not reviewed (Claude wrote them): `4e4f268` option A, `83145be`, `b4ac9cd`.
- **Circular hooks + React Compiler lint (s. 19–20):** the loop (socket handler needs the player, player callbacks need `send`) and option A; options table landed (A, late-bound holder ref, one combined hook, controls before declaration).
- **File name case:** macOS ignores case, Linux (deploy) doesn't. Fixed `useYoutubePlayer.ts` with `mv`.
- **Pure functions for testability:** pass time in (`nowMs`) and YouTube state as a boolean.
- **Chrome autoplay policy:** a received `playVideo()` is blocked until the tab has had one click.

## Moved 2026-10-16 (session 25): M4 deploy detail

- **Debugging a server-side ghost (s. 22):** found the bfcache bug themselves; Go log showed no `left` line → Go never saw a close → confirmed by closing the tab. Reported exact repro steps.
- **Dev vs prod serving (s. 22):** 8080 serves the last `bun run build` (matches prod); 5173 for editing.
- **Hosting constraints (s. 21):** half-got serverless (missed: several copies = several `rooms` maps). Applied `--ha=false` themselves.
- **Docker (s. 21):** container = isolated process, not a VM. Wrote the 3-stage Dockerfile from blanks; `COPY` source needed two hints. `.dockerignore`, `--target`, `CGO_ENABLED=0`, `COPY --from`, `-p`.
- **Fly.io (s. 21–25):** `fly auth login`, `fly launch --no-deploy`, `fly.toml`, `fly deploy --ha=false`, `fly status`, `fly logs`. Deployed the restyle on their own (s. 25).
- **SPA fallback (s. 21):** wrote `spaHandler`; why `http.Dir.Open` over `os.Open` was told, not checked.
- **Untrusted input / version skew (s. 21):** `unknown` vs `any`; try/catch around `JSON.parse`; shape check; suggested `position >= 0` themselves.
