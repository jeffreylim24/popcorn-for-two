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
