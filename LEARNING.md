# Learning Snapshot

_Last updated: 2026-10-14 (session 10)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch; Java → Go tables work. Used once each in real code:
  - Session 7: `func`, `for` forms (no `while`), `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, `string(s[i])`, `rand.IntN`.
  - Session 8: **route wildcards** `"GET /api/rooms/{code}/ws"` + `r.PathValue("code")`.
  - Session 9: **`for {}` read loop**; **closures vs top-level funcs** (closure only when it captures locals); **typed named constants**.
  - Session 10: **set idiom `map[K]bool` and nested maps.** First wrote the *contents* (`{alice, true; bob, true}`) instead of the *type*, then the Java spelling `Set<Conn>`. Showing the same nesting with other types (`map[string]map[int]bool` = `Map<String, Set<Integer>>`) landed. Initialized the inner map in `createRoom` (nil-map trap) unprompted.
- **`context.Context`:** introduced (Java analogy: `interrupt()` / `setSoTimeout`). Said Read errors "when the socket closes" but skipped the timeout and cancel exits. Not rechecked in session 10 (no real case came up). Next time: have them name *what* cancels a ctx (deadline, `cancel()`, parent) on a real case, e.g. the heartbeat `Ping(ctx)` with a timeout.
- **HTTP methods vs URLs:** once mixed up the page URL (`/room/CODE`, Vite) with the API URL. A two-URL diagram + fill-in-the-blank cleared it up.
- **`fmt.Fprint(w, …)` writes the HTTP response:** `log` = your terminal; `w` = the requester.

### Learning (introduced, used or explained back once)
- **Errors as values + sentinel errors:** picked `error` as the return for 3 outcomes; after a Java exception-class table, wrote `errors.New` sentinels, `errors.Is`, and a catch-all `err != nil` → 1011 (ordered like `catch (Exception e)` last). Fixed `==` → `errors.Is` once told why (wrapping).
- **`defer`:** used for `leaveRoom`, but first placed it right after `defer CloseNow()` (would run on rejected joins). "Does it run when tab 3 is rejected?" got them there. Rule: defer the undo right after the thing succeeds. One more correct placement → Solid.
- **Goroutines + `sync.Mutex`:** check + full + add under one lock in `joinRoom`; reads go under the lock too. Explained the full check correctly but said "more than 2 people" (it's exactly 2; the third is never added).
- **Who logs an error:** logged rejections in both `joinRoom` and the handler. Rule: the function that acts on the error logs it.
- **App close codes:** 4000–4999 app-defined; 4004 not found, 4005 full; 1011 internal error is standard.
- **Logging in production:** log events (connect, reject, leave, errors), not traffic; `Received message` is dev-only.
- **WebSocket handshake:** GET + `Upgrade` → 101 → two-way. Close codes 1000 normal, 1006 abnormal.
- **Go dependencies:** `go get`, `go.mod` / `go.sum`, `// indirect`, `go mod tidy`.
- **Debugging a hang:** silent Go log + `ws.readyState` + Network tab "pending".
- **WebSocket heartbeat**, **signaling (WebRTC)**, **WebSocket vs fetch:** planning only, no code yet.
- **HTTP statuses** (405 vs 404), **`useRef`**, **effect cleanup**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` loading races**, **TS globals**, **deps vs devDeps / lockfiles**, **`net/http` basics**, **CORS / Vite proxy**, **`response.ok`**, **StrictMode**, **`useState`/`useEffect`**, **message contracts**.

### Solid
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case** (session 10: the 3-tab and leave tests; found the never-freed slot themselves).
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, false-leave risk.
- **Errors as return values** (`x, err := f()`; `if err != nil { log; return }`).
- Git: checking a commit before pushing, four areas, `status -sb`, upstream; Conventional Commits; one logical change per commit; selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; shadcn/ui + Tailwind; Bun; ESLint; no React Compiler.
- **Backend:** Go, flat layout until there are several programs.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. Ports: Vite 5173, Go 8080; Vite proxies `/api` (with `ws: true`).
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand after M3; CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. LEARNING.md is committed by Claude at wrap-up. **No `Co-Authored-By: Claude` trailer on the user's own code commits.**
- **Raw YouTube IFrame API, no React wrapper:** sync is imperative; the echo loop needs control. Player lives in `playerRef`.
- **Reload the page after editing code inside an effect** (React 19.3 + plugin-react 6.1).
- **Rooms (M2):** server-generated 6-char code; max 2; copy-link `…/room/CODE`; ping 15s / dead after 30s. Full list in `ROADMAP.md`.
- **WebSocket library: `coder/websocket`:** maintained, concurrent writes allowed (relaying needs it), `Ping(ctx)` for the heartbeat.
- **Join route `GET /api/rooms/{code}/ws`;** rejects after `Accept` with app close codes so JS can read them.
- **`rooms` is `map[string]map[*websocket.Conn]bool`** guarded by `roomsMutex`: a set per room gives count (full), loop (relay), `delete` (leave).
- **Map-touching helpers are top-level funcs with `Lock()` + `defer Unlock()`** (`createRoom`, `joinRoom`, `leaveRoom`); never lock with `defer` inside the long-running handler.
- **`joinRoom` returns sentinel errors;** the handler matches with `errors.Is`, anything else closes 1011.
- **`defer leaveRoom` only after a successful join;** empty rooms are kept (refresh-safe); room expiry is in Later.
- **`conn.Read(r.Context())`** is fine after hijack.
- **Logs:** lifecycle and error logs stay; `Received message` goes once relaying works. One log per event, in the function that acts.
- **Run `go vet ./...` before committing Go.**

## Open questions

- None here. Per-milestone design questions live in `ROADMAP.md`.

## Teaching formats

- Works: **Java → Go comparison tables** (mutex, `defer` ≈ `finally`, exception classes vs sentinel errors, `Set<T>` vs `map[T]bool`). Ask "what do you remember?" first.
- Works: **the same pattern shown with different types/domain** (`map[string]map[int]bool`, a `withdraw` example) so they write their own version.
- Works: ASCII flow diagrams and **scenario traces with the state after each line** (the refresh-kills-the-room trace made the design call easy).
- Works: **fill-in-the-blank** when an open question confuses.
- Works: **guiding question about a concrete case** ("does it run when tab 3 is rejected?") instead of naming the fix.
- **Doesn't work: compound or re-asked questions.** Ask one open thing; state settled facts as settled. Questions asking for several items get one answer.
- **They run ahead:** often write the whole helper (or extra cleanup) beyond the asked step. Review the full diff; flag unasked design changes with a scenario + trade-off table, then let them decide.
- Works: reviewing drafts; "explain it back" after running something; forcing rare cases with browser-console tests.
- Works: one new idea per step with syntax up front; saying production vs test-only vs dev-only.
- **Be precise about where code goes.** **Tie a step to the end goal up front.** **State third-party tool facts directly.**
- **Claude: verify tool/library behavior before relying on it.**
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- When deciding, wants a recommendation + trade-off table.

## Next step

**M2, last piece: relay.** Join/full/leave are committed (`8b29524`, `e1c6046`). Next: when one tab's read loop gets a message, write it to the other conn(s) in the room. Questions to open with: how does the handler get the *other* conns (snapshot under the lock, write outside it?), and which ctx to use for `conn.Write`. Then remove the `Received message` log. Two tabs see each other's messages → M2 done.
