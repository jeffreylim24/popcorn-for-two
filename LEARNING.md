# Learning Snapshot

_Last updated: 2026-10-11 (session 8)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch; Java → Go tables work. Used once each in real code:
  - Session 7: `func`, `for` forms (no `while`), `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, `string(s[i])`, `rand.IntN`.
  - Session 8: **errors as return values** (`x, err := f()`; `if err != nil { log; return }`). Right on the first try.
  - Session 8: **route wildcards** `"GET /api/rooms/{code}/ws"` + `r.PathValue("code")`.
- **`defer`:** writes it correctly (`Lock()` + `defer Unlock()`, `defer conn.CloseNow()`), but explained "the socket closed because we called `defer CloseNow()` right after Accept", as if the defer runs on its own line. Corrected with a line-by-line trace showing it fires at function exit. **Check again** when the read loop goes in: "why doesn't the defer close it now?"
- **HTTP methods vs URLs:** proposed POST for the WebSocket handshake, then reasoned "not GET because the code is already in the URL" and suggested `UPDATE` (not a method). Mixed up the **page URL** (`/room/CODE`, served by Vite) with the **API URL** the page connects to. A two-URL diagram + fill-in-the-blank (`"GET /api/rooms/____"`) cleared it up. Also proposed "check the room, then join" as two requests; tied it back to check-then-act.
- **`fmt.Fprint(w, …)` writes the HTTP response:** `log` = your terminal; `w` = the requester. End-to-end diagram answered it.

### Learning (introduced, used or explained back once)
- **Goroutines + `sync.Mutex`:** recalled the Java `HashMap` check-then-act race unprompted (both see null, last write wins). Knows Go crashes on concurrent map writes (Java corrupts silently). Placed the lock over check + loop + write and left `generateRoomCode()` outside. Said Bob's goroutine waits and his fetch stays pending. Next: reads need the lock too (join route).
- **WebSocket handshake:** starts as a GET with `Upgrade: websocket` → 101 → same connection, now two-way. Handler keeps running while the connection is open. Close codes: 1000 normal, 1006 abnormal (`CloseNow` skips the goodbye).
- **Go dependencies:** `go get` → `require` in `go.mod`, checksums in `go.sum`; `// indirect` until imported; `go mod tidy` drops unused deps.
- **Debugging a hang:** used the silent Go log + `ws.readyState` 0 + Network tab "pending" to locate it at the Vite hop.
- **WebSocket heartbeat**, **signaling (WebRTC)**, **WebSocket vs fetch:** planning only, no code yet.
- **HTTP statuses** (405 vs 404), **`useRef`**, **effect cleanup**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` loading races**, **TS globals**, **deps vs devDeps / lockfiles**, **`net/http` basics**, **CORS / Vite proxy**, **`response.ok`**, **StrictMode**, **`useState`/`useEffect`**, **message contracts**.

### Solid
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case.**
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap.
- Git: checking a commit before pushing, four areas, `status -sb`, upstream; Conventional Commits; one logical change per commit; selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; shadcn/ui + Tailwind; Bun; ESLint; no React Compiler.
- **Backend:** Go, flat layout until there are several programs.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. Ports: Vite 5173, Go 8080; Vite proxies `/api` (with `ws: true` for WebSockets).
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand after M3; CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. LEARNING.md is committed by Claude at wrap-up.
- **Raw YouTube IFrame API, no React wrapper:** sync is imperative; the echo loop needs control. Player lives in `playerRef`.
- **Reload the page after editing code inside an effect** (React 19.3 + plugin-react 6.1).
- **Rooms (M2):** server-generated 6-char code; max 2 per room; copy-link `…/room/CODE`; ping 15s / dead after 30s. Full list in `ROADMAP.md`.
- **`POST /api/rooms` returns the code as plain text.** `math/rand/v2`, case-sensitive 62-char alphabet. Map value is a `bool` placeholder.
- **`rooms` guarded by `roomsMutex`** (named after its data); `Lock()` + `defer Unlock()`.
- **WebSocket library: `coder/websocket`:** maintained, concurrent writes allowed (relaying needs it), `Ping(ctx)` fits the heartbeat. Trade-off: fewer tutorials than gorilla.
- **Join route `GET /api/rooms/{code}/ws`:** `/ws` so a plain `GET /api/rooms/{code}` stays free for room info; `code` matches `roomCode` naming. Check + join happen in this one request, under the lock.
- **Run `go vet ./...` before committing Go.**

## Open questions

- None here. Per-milestone design questions live in `ROADMAP.md`.

## Teaching formats

- Works: **Java → Go comparison tables** (mutex, `defer` ≈ `finally`, errors vs exceptions, Spring `@PathVariable` vs `PathValue`). Ask "what do you remember?" first; the HashMap question landed well.
- Works: ASCII flow diagrams, especially **end-to-end "who handles this?" diagrams** (two-URL diagram, browser → Vite → Go hang).
- Works: **examples as real sequences with the state after each line**; a line-by-line trace of the user's own code to fix a misread.
- Works: **fill-in-the-blank** when an open question confuses (`"GET /api/rooms/____"`).
- **Doesn't work: compound or re-asked questions.** Asking for the method again after already saying it was GET confused them. Ask one open thing; state settled facts as settled.
- Works: reviewing the user's drafts; concrete scenario questions; "explain it back" after running something; forcing rare cases.
- Works: one new idea per step with syntax up front; saying production vs test-only vs dev-only.
- **Be precise about where code goes.** **Tie a step to the end goal up front.**
- **State third-party tool facts directly** (Vite's `ws: true`) after the user has located the problem.
- **Claude: verify tool/library behavior before relying on it** (checked coder/websocket signatures in the module cache).
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- When deciding, wants a recommendation + trade-off table.

## Next step

**M2 in progress:** the join route accepts a WebSocket but closes as soon as the handler returns. Next: a **read loop** so the handler stays alive (new idea: `context.Context`, needed by `conn.Read(ctx)`; check the coder/websocket docs on which ctx to use, since `Accept` warns about `r.Context()` after hijack). Then: check the room exists and isn't full, under `roomsMutex`; then relay a message between two tabs (M2 done).
