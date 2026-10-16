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
