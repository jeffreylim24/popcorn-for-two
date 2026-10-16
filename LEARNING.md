# Learning Snapshot

_Last updated: 2026-10-16 (session 20)_

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
  - Recheck on the heartbeat `Ping(ctx)` (M4 or later): have them pick the parent + timeout and say who holds the button.
- **`useRef` (read at call time vs copy early):** still the weakest React idea. Tried: Java instance-field table (s. 12–13), read-at-fire-time vs copy-into-a-local trace (s. 12). Session 20: asked why `send` (`useCallback`, empty deps) still hits the *new* socket → "idk". Explained with **"`send` holds the box, not what's in it"** + a timeline (box: A → null → B) + the broken copy-early version side by side; no explain-back (they stopped the review). Next time: don't quiz it cold; let it come up in real code (e.g. the M4 `readyState` check reads `socketRef.current` at call time) and ask then.
- **HTTP:** once mixed up the page URL (`/room/CODE`) with the API URL (two-URL diagram fixed it); `fmt.Fprint(w, …)` writes the response, `log` writes your terminal.

### Learning (introduced, used or explained back once)
- **Custom hooks + rules of hooks** (sessions 17–20): explained call order unprompted ("React reruns the function top to bottom, order must match"). Gap fixed: React matches hooks by **slot position, not name** (slot-mismatch diagram). They mixed it up with the `playerRef` loop; corrected: that was JS declaration order in one render (table: React's rule vs JS's rule). Why hooks: said "less code"; the real points (one feature split across lifecycle methods; no reuse of stateful logic) were explained, not checked. Wrote `useHealth`, `useRoomSocket`, the `useYouTubePlayer` move. Reasoned well why the echo guard belongs in `useSync` (coupling, single responsibility).
- **Hook-split review** (session 20): reviewed `7efa953`, `8fba79e`, `666bb94` (their own). Got: a `code` change would leave the new socket without a handler (half: said "old onmessage"; it's on the closed socket). **Not reviewed** (Claude wrote them): `4e4f268` option A, `83145be`, `b4ac9cd`. They chose to move on to M4; revisit only when touching those hooks.
- **Function identity / `useEffectEvent` / `useCallback`:** session 20 answered right: a new inline arrow in the deps would close and reopen the socket every render. `useCallback` vs `useEffectEvent` table given (hand out + allowed in deps vs called inside your own effect, never in deps). The `83145be` recheck ("once `sendAction` reads a changing value, what does the player call without vs with `useEffectEvent`?") still not done.
- **Circular hooks + React Compiler lint** (s. 19–20): the loop (socket handler needs the player, player callbacks need `send`) and option A. Session 20: asked "what's the decision here, what were the alternatives?" → options table (A, late-bound holder ref, one combined hook, controls referenced before declaration). Chose A.
- **Unit tests with Vitest** (session 16): `describe` / `test` / `expect().toBe()`, `*.test.ts`. 17 tests across 3 pure functions. Mutation checks exposed missing boundary/rewind/paused cases; later covered them unprompted. Test names: `situation: outcome`.
- **File name case:** macOS ignores case, Linux (deploy) doesn't. Fixed `useYoutubePlayer.ts` with `mv`.
- **JSDoc and comment content:** a good comment says *why* or the non-obvious part (units, signed gap), not the function name.
- **Pure functions for testability:** pass time in (`nowMs`) and YouTube state as a boolean.
- **Chrome autoplay policy:** a received `playVideo()` is blocked until the tab has had one click (confirmed by test).
- **`setInterval` / `clearInterval`**, **echo guard ("only send news")**, **sync design ("ahead wins", interval = longest undetected drift)**, **guards over enums** (recheck: list every state a guard lets through), **refactor habits** (named constants with unit suffixes, Prettier).
- **Browser `WebSocket`**, **`JSON.stringify` / `JSON.parse`**, **TS literal unions / guard clauses** (TS types are unchecked at runtime), **StrictMode double-mount**.
- **Backend (M2), details in `docs/learning-archive.md`:** goroutine per connection, sentinel errors, `defer`, `sync.Mutex`, close codes, WebSocket handshake, Go deps.
- **HTTP statuses** (405 vs 404), **effect cleanup**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` loading races**, **TS globals**, **deps vs devDeps / lockfiles**, **`net/http` basics**, **CORS / Vite proxy**, **`response.ok`**, **`useState`/`useEffect`**, **message contracts**.

### Solid
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case.**
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, false-leave risk, single responsibility when placing logic.
- **Errors as return values**; log-and-continue when the error is someone else's.
- Git: checking a commit before pushing, four areas, `status -sb`, upstream; Conventional Commits; one logical change per commit; selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; shadcn/ui + Tailwind; Bun; ESLint; no React Compiler. Keep StrictMode.
- **Backend:** Go, flat layout until there are several programs. Run `go vet ./...` before committing Go.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. Ports: Vite 5173, Go 8080; Vite proxies `/api` (with `ws: true`).
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand (M4); CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. No `Co-Authored-By: Claude` on the user's own code commits.
- **Raw YouTube IFrame API, no React wrapper:** sync is imperative; the echo loop needs control.
- **Reload the page after editing code inside an effect** (React 19.3 + plugin-react 6.1).
- **WebSocket library `coder/websocket`:** concurrent writes allowed, `Ping(ctx)` for the heartbeat.
- **Rooms (M2) and Sync (M3):** all design calls are in `ROADMAP.md` under each milestone. **M3 ticked** (session 20).
- **Map-touching helpers are top-level funcs with `Lock()` + `defer Unlock()`**; the long-running handler never holds the lock.
- **Logs:** lifecycle and error logs only; no per-message log.
- **Keep YouTube's own controls;** paused seeks caught by a 500 ms position check.
- **Prettier** (pinned exact, single quotes, no semicolons). Formatting commits stay separate from logic commits.
- **Sync rules live in `src/sync.ts`** as pure functions, tested with Vitest (`bun run test`).
- **4-hook split:** `useHealth`, `useRoomSocket` (stable `send`), `useYouTubePlayer` (player + timers, callbacks out), `useSync` (owns `playerRef`, `lastStateRef`, the policy; composes the other two). Why: one reason to change each.
- **Option A:** `useSync` creates `playerRef` and passes it into `useYouTubePlayer`. Why: breaks the hook loop, lint-clean, hooks stay apart. Alternatives rejected in `ROADMAP.md` M3.
- **`useSync(code, elementId, videoId)`:** the page picks element and video; only App changes when video choice arrives.
- **Move to M4 now; code-quality pass deferred** (session 20). Why: refactor fatigue, code works. Root README comes out of M4; Go tests for join/leave/full during or after M4.
- **`JSON.parse` guard + `send` readyState check** are the first M4 code steps.

## Open questions

- Per-milestone design questions live in `ROADMAP.md`.

## Teaching formats

- Works: **comparison tables** (Java → Go/TS only when asked), **traces with state after each line**, **two-column timelines**, **slot/box diagrams**, **concrete everyday analogies** after mechanism explanations don't land. Ask "what do you remember?" first.
- Works: **fill-in-the-blank**; **guiding question about a concrete case**; **options table + one recommendation + "which one?"** for decisions. When a "decision" looks like no choice, show the rejected alternatives (session 20).
- **Doesn't work: compound or re-asked questions.** One open thing; state settled facts as settled.
- **Give exact commands every time** (which terminal, what to run, what to look at).
- **They run ahead:** review the full diff; flag design changes with a scenario + trade-off table.
- **They ask "why does this work?" after it works.** Follow it before moving on.
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- **Don't record a decision until they say so**: a "should we?" question is not a yes.
- Asks for code on mechanical work; fine under the exception; keep concept steps theirs.
- **Hook work in small turns works:** move code → wire + verify → one new concept, each with a syntax skeleton and exact edits.
- When tired, stops answering rechecks. **Session 20: a quiz-per-commit review wore them out** ("ok whatever let's skip") after an "idk" on a recheck, and they said they're tired of refactoring with no real progress. Prefer forward progress; put rechecks inside real feature steps instead of review sessions. If reviewing, summary + one key point per commit, quiz only if unclear.
- **"Break it on purpose" only after Vitest test steps,** and make sure they can actually run.

## Next step

**Start M4: First deploy.** Open with the pending question: the Go server keeps one WebSocket open per person for the whole movie and keeps rooms in an in-memory map; what must a host allow? (Points toward a long-running process, not serverless; one instance.) Then decide hosting and one origin (Go serves the built frontend) vs separate hosting (CORS). First code steps: `JSON.parse` `try/catch` + shape check, and a `readyState` check before `send`.
