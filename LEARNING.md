# Learning Snapshot

_Last updated: 2026-10-15 (session 14)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch; Java → Go tables work. Used once each in real code:
  - Session 7: `func`, `for` forms (no `while`), `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, `string(s[i])`, `rand.IntN`.
  - Session 8: **route wildcards** `"GET /api/rooms/{code}/ws"` + `r.PathValue("code")`.
  - Session 9: **`for {}` read loop**; **closures vs top-level funcs**; **typed named constants**.
  - Session 10: **set idiom `map[K]bool` and nested maps** (same nesting with other types landed).
  - Session 11: **`for k := range m`** over a set (a `map[int]bool` trace landed). Ranging a nil map is safe.
- **`context.Context`:** Picked "cancel after a timeout" for `Write` unprompted. Asked "how should I think of context?" after two explanations:
  - Tried: `Done()` channel + simplified `select` + ctx tree diagram → understood `cancel()` but not the big picture.
  - Landed (tentatively): **"a stop button the caller holds; the function only watches it"** + delivery-order-with-a-note table.
  - Recheck on the heartbeat `Ping(ctx)` (M2 Later / M4): have them pick the parent + timeout and say who holds the button.
- **`useRef`:** doesn't come to mind as "a place to keep a note"; recalled only via the **Java instance-field table**. Session 12: explained why `onStateChange` reaches the socket as "it will have run by then" (half). Completed with a **read-the-ref-at-fire-time vs copy-into-a-local** trace + Java table (lambda reading `this.socket` vs capturing a `final` local). Session 13: filled in `timerRef = useRef<number | null>` from a blank next to the other two refs (Java-field framing), but first suggested putting the id on the YT config object. The early-copy recheck question went unanswered. Recheck: ask why a handler that copied `socketRef.current` early would break.
- **HTTP methods vs URLs:** once mixed up the page URL (`/room/CODE`, Vite) with the API URL. A two-URL diagram cleared it up.
- **`fmt.Fprint(w, …)` writes the HTTP response:** `log` = your terminal; `w` = the requester. (Didn't remember how to create a room; `curl -X POST` explained via this.)

### Learning (introduced, used or explained back once)
- **`setInterval` / `clearInterval`** (Java `scheduleAtFixedRate` / `cancel` table): started the paused check right. Clearing needed the timer id kept outside the call (→ `useRef`). First version re-seeked its own player instead of sending; one "who doesn't know yet?" question fixed it.
- **Echo guard ("only send news")**: compare an outgoing send to the last agreed state (`{state, position, at}`), projecting position while playing. First stored only `state`; a scenario table (paused seek / playing seek get dropped) showed why `position` + `at` are needed. Fixed right away.
- **Log placement vs what actually happened:** a log before the decision printed for skipped sends too, so it looked like B was still sending. DevTools **Network → WS → Messages** (↑ sent / ↓ received) is the real proof.
- **Testing a hypothesis with logs:** guessed "seek fires no event", logged every `onStateChange`, found it holds only while paused. Asked "why did it buffer this time?", and then saw it doesn't always.
- **Cross-origin iframe:** the page can't see clicks inside YouTube's player; only API events reach you.
- **JS runs one thing at a time:** no timer tick can land in the middle of a cleanup function (like code on one Java thread).
- **Refactor habits:** a helper inside the effect (keeps `exhaustive-deps` quiet); named constants with unit suffixes (`_S`, `_MS`); Prettier (`format`, `format:check`).
- **Browser `WebSocket`:** `new WebSocket(relativeUrl)`, `onmessage`, `close()` in effect cleanup. Wrote it right first try.
- **`JSON.stringify` / `JSON.parse`** (Jackson table): put `onmessage` inside the YT player's `events` first. One guiding question ("which object fires `onmessage`?") fixed it.
- **Reading TS overload errors:** skip overloads that never applied; the matching overload's reason is the real error; later errors can be fallout.
- **TS literal union types** (`'playing' | 'paused'`), a `type` for the message, **guard-clause early return**: wrote them unprompted. A TS type is unchecked at runtime (unlike a Java cast); `JSON.parse` returns `any`.
- **StrictMode double-mount:** "React shenanigans" → found `<StrictMode>` in `main.tsx` from a pointer. Reasoned that without cleanup, tab 2 gets room full (4005).
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
- **HTTP statuses** (405 vs 404), **effect cleanup**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` loading races**, **TS globals**, **deps vs devDeps / lockfiles**, **`net/http` basics**, **CORS / Vite proxy**, **`response.ok`**, **`useState`/`useEffect`**, **message contracts**.

### Solid
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case.**
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, false-leave risk.
- **Errors as return values**; log-and-continue when the error is someone else's.
- Git: checking a commit before pushing, four areas, `status -sb`, upstream; Conventional Commits; one logical change per commit; selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; shadcn/ui + Tailwind; Bun; ESLint; no React Compiler. Keep StrictMode.
- **Backend:** Go, flat layout until there are several programs. Run `go vet ./...` before committing Go.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. Ports: Vite 5173, Go 8080; Vite proxies `/api` (with `ws: true`).
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand after M3; CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. LEARNING.md is committed by Claude at wrap-up. **No `Co-Authored-By: Claude` trailer on the user's own code commits.**
- **Raw YouTube IFrame API, no React wrapper:** sync is imperative; the echo loop needs control.
- **Reload the page after editing code inside an effect** (React 19.3 + plugin-react 6.1).
- **WebSocket library `coder/websocket`:** concurrent writes allowed, `Ping(ctx)` for the heartbeat.
- **Rooms (M2) and Sync (M3):** all design calls are in `ROADMAP.md` under each milestone.
- **Map-touching helpers are top-level funcs with `Lock()` + `defer Unlock()`**; the long-running handler never holds the lock.
- **`r.Context()` after `Accept` ends only when the handler returns** (checked in Go source). A client disconnect shows up as a `Read` error.
- **Logs:** lifecycle and error logs only; no per-message log.
- **Keep YouTube's own controls;** paused seeks are caught by a 500 ms position check while paused. Custom controls = mostly visual work.
- **Prettier** (pinned exact, single quotes, no semicolons) in `frontend/`. Formatting commits stay separate from logic commits.
- **Echo guard = "only send news"** in `sendAction` against `lastStateRef` (full design in `ROADMAP.md` M3).
- **Code review backlog** (hooks split, pure functions + first tests, `JSON.parse` guard) is scheduled in `ROADMAP.md` M3/M4.

## Open questions

- None here. Per-milestone design questions live in `ROADMAP.md`.

## Teaching formats

- Works: **Java → Go/TS comparison tables** (mutex, `defer` ≈ `finally`, sentinel errors, `Set<T>`, Jackson vs `JSON`, fields vs captured locals). Ask "what do you remember?" first.
- Works: **the same pattern shown with different types/domain**; **traces with the state after each line**; **two-column timelines** for concurrency.
- Works: **concrete everyday analogies** after mechanism-level explanations don't land.
- Works: **fill-in-the-blank**; **guiding question about a concrete case** (e.g. "which object fires `onmessage`?") instead of naming the fix.
- **Doesn't work: compound or re-asked questions.** Ask one open thing; state settled facts as settled.
- **Give exact commands every time** (which terminal, what to run, what to look at). Never "the same way as in M2"; they don't remember.
- **They run ahead** (session 12: added `SyncMessage` + `e.target` beyond the step, both good): review the full diff; flag design changes with a scenario + trade-off table.
- **They ask "why does this work?" after it works.** Follow it before moving on.
- Works: reviewing drafts; "explain it back"; console tests that force rare cases; one new idea per step with syntax up front; saying production vs test-only vs dev-only.
- **Be precise about where code goes.** **Tie a step to the end goal up front.** **Verify tool/library behavior before relying on it.**
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- When deciding, wants a recommendation + trade-off table. **Don't record a decision until they say so**: a "should we?" question is not a yes (session 13 slip).
- Asks for code on mechanical work (session 13: the `stopTimer` refactor, the constants + Prettier setup). Fine under the "write it for me" exception; keep the concept steps theirs.
- Session 14: asked to skip small quizzes and get to the point. An options table + one recommendation + "which one?" worked well for a design choice.
- Asks for a code review against "industry standards" now and then: a ranked table (principle, why, when) landed.

## Next step

**M3: Sync.** Play, pause, and seek sync both ways, and the echo guard is in (committed, not yet pushed). Next: **the `sync` tick** (every 2 s while playing, receiver seeks only if the partner is ahead by over 1 s). Start with the open question in `ROADMAP.md` M3: how `sync` sends and applies interact with `lastStateRef`.
