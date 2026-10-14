# Learning Snapshot

_Last updated: 2026-10-14 (session 11)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch; Java → Go tables work. Used once each in real code:
  - Session 7: `func`, `for` forms (no `while`), `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, `string(s[i])`, `rand.IntN`.
  - Session 8: **route wildcards** `"GET /api/rooms/{code}/ws"` + `r.PathValue("code")`.
  - Session 9: **`for {}` read loop**; **closures vs top-level funcs**; **typed named constants**.
  - Session 10: **set idiom `map[K]bool` and nested maps** (same nesting with other types landed).
  - Session 11: **`for k := range m`** over a set (didn't know how to loop a non-indexed map; a `map[int]bool` trace with state per iteration landed, wrote `getPartnerConn` correctly first try). Ranging a nil map is safe (zero iterations).
- **`context.Context`:** Picked "cancel after a timeout" for `Write` unprompted (deadline exit ✓). Still asked "how should I think of context?" after two explanations this session:
  - Tried: `Done()` channel + simplified `select` inside `Write` + ctx tree diagram → understood `cancel()` (cleanup: stop timer, detach from parent) but not the big picture.
  - Landed (tentatively, "I get it for now"): **"a stop button the caller holds; the function only watches it"** + delivery-order-with-a-note table.
  - Unanswered check: "in the stuck-B case, which exit ends the Write's ctx?" Recheck on the heartbeat `Ping(ctx)` (M2 Later / M4): have them pick the parent + timeout and say who holds the button.
- **HTTP methods vs URLs:** once mixed up the page URL (`/room/CODE`, Vite) with the API URL. A two-URL diagram cleared it up.
- **`fmt.Fprint(w, …)` writes the HTTP response:** `log` = your terminal; `w` = the requester.

### Learning (introduced, used or explained back once)
- **Goroutine per connection + blocking `Read`:** confused why A's loop got past `Read` while B's didn't. A two-column timeline (A's goroutine vs B's, state per tick) + "browser → server → browser" diagram fixed it. Explained back correctly: each goroutine reads only its own browser; any goroutine can write to any conn it holds. Follow-ups they reasoned out: the loop runs once per message (not spinning); blocked goroutines cost no CPU (vs busy-waiting).
- **Locals declared inside a loop are ~free** (stack slots reused); real per-message costs are `msg`'s byte slice and the ctx timer.
- **Errors as values + sentinel errors:** `errors.New` sentinels, `errors.Is`, catch-all `err != nil` → 1011 last. Knows why `errors.Is` over `==` (wrapping).
- **`defer`:** rule: defer the undo right after the thing succeeds. Plus: **don't `defer` inside a long loop** (runs at function return, not per iteration). One more correct placement → Solid.
- **Goroutines + `sync.Mutex`:** helpers lock briefly; read under the lock, act (write) outside it. Locks protect the map, not the conn (B can leave between lookup and `Write`; `Write` just errors).
- **Who logs an error:** the function that acts on the error logs it.
- **App close codes:** 4000–4999 app-defined; 4004 not found, 4005 full; 1011 internal error.
- **Logging in production:** log events (connect, reject, leave, errors), not traffic.
- **WebSocket handshake:** GET + `Upgrade` → 101 → two-way. Close codes 1000 normal, 1006 abnormal.
- **Go dependencies:** `go get`, `go.mod` / `go.sum`, `// indirect`, `go mod tidy`.
- **WebSocket heartbeat**, **signaling (WebRTC)**, **WebSocket vs fetch:** planning only, no code yet.
- **HTTP statuses** (405 vs 404), **`useRef`**, **effect cleanup**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` loading races**, **TS globals**, **deps vs devDeps / lockfiles**, **`net/http` basics**, **CORS / Vite proxy**, **`response.ok`**, **StrictMode**, **`useState`/`useEffect`**, **message contracts**.

### Solid
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case** (3-tab, leave, and two-tab relay tests from the console).
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, false-leave risk.
- **Errors as return values** (`x, err := f()`; `if err != nil { log; return }`); log-and-continue when the error is someone else's (partner's `Write`).
- Git: checking a commit before pushing, four areas, `status -sb`, upstream; Conventional Commits; one logical change per commit; selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; shadcn/ui + Tailwind; Bun; ESLint; no React Compiler.
- **Backend:** Go, flat layout until there are several programs. Run `go vet ./...` before committing Go.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. Ports: Vite 5173, Go 8080; Vite proxies `/api` (with `ws: true`).
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand after M3; CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. LEARNING.md is committed by Claude at wrap-up. **No `Co-Authored-By: Claude` trailer on the user's own code commits.**
- **Raw YouTube IFrame API, no React wrapper:** sync is imperative; the echo loop needs control. Player lives in `playerRef`.
- **Reload the page after editing code inside an effect** (React 19.3 + plugin-react 6.1).
- **WebSocket library `coder/websocket`:** concurrent writes allowed (relay needs it), `Ping(ctx)` for the heartbeat.
- **Rooms (M2, done):** all design calls are in `ROADMAP.md` M2 (code gen, max 2, set of conns, sentinel errors, close codes, leave, relay).
- **Map-touching helpers are top-level funcs with `Lock()` + `defer Unlock()`** (`createRoom`, `joinRoom`, `leaveRoom`, `getPartnerConn`); the long-running handler never holds the lock.
- **`r.Context()` after `Accept` ends only when the handler returns** (net/http stops watching a hijacked socket; checked in Go source). A client disconnect shows up as a `Read` error, not ctx. Still the right parent by convention.
- **Logs:** lifecycle and error logs only; no per-message log.

## Open questions

- None here. Per-milestone design questions live in `ROADMAP.md`.

## Teaching formats

- Works: **Java → Go comparison tables** (mutex, `defer` ≈ `finally`, exception classes vs sentinel errors, `Set<T>` vs `map[T]bool`, thread-per-socket vs goroutine-per-request). Ask "what do you remember?" first.
- Works: **the same pattern shown with different types/domain** so they write their own version.
- Works: **traces with the state after each line**, and **two-column timelines** for concurrent goroutines.
- Works: **concrete everyday analogies for abstract concepts** (ctx = stop button the caller holds / delivery note) after mechanism-level explanations didn't land.
- Works: **fill-in-the-blank** when an open question confuses; **guiding question about a concrete case** instead of naming the fix.
- **Doesn't work: compound or re-asked questions.** Ask one open thing; state settled facts as settled.
- **They run ahead** (write beyond the step): review the full diff; flag unasked design changes with a scenario + trade-off table.
- **They ask "why does this work?" after it works.** Good instinct; follow it before moving on.
- Works: reviewing drafts; "explain it back" after running something; console tests that force rare cases.
- Works: one new idea per step with syntax up front; saying production vs test-only vs dev-only.
- **Be precise about where code goes.** **Tie a step to the end goal up front.** **Verify tool/library behavior before relying on it** (session 11: wrongly said `r.Context()` ends on client disconnect after hijack; corrected after reading net/http source).
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- When deciding, wants a recommendation + trade-off table.

## Next step

**M3: Sync.** Design is settled (session 12, all in `ROADMAP.md` M3). Next: connect `App.tsx` to a room (`socketRef` + effect, code from `/room/CODE` path, `onmessage` logs). Test with two tabs; if one tab opens two sockets, ask them why before fixing (StrictMode). Session 12 notes for wrap-up: `useRef` didn't come to mind as "where to keep a note" (recalled only via Java instance-field table); one-use-ticket analogy + trace led to clearing the note to `null`.
