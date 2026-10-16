# Learning Snapshot

_Last updated: 2026-10-15 (session 17)_

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
- **HTTP:** once mixed up the page URL (`/room/CODE`) with the API URL (two-URL diagram fixed it); `fmt.Fprint(w, …)` writes the response, `log` writes your terminal.

### Learning (introduced, used or explained back once)
- **Unit tests with Vitest** (session 16): `describe` / `test` / `expect().toBe()`, `*.test.ts`, test-only code in devDeps. Wrote 17 tests across 3 pure functions. Gaps found in review: no test exactly at the threshold, no rewind (`Math.abs`) case, no paused case through `isNews`. "Break it on purpose" (mutation check) exposed each one. By `shouldCatchUp` they covered the boundary, the opposite sign, and the guard unprompted. Test names: moved from "should return true" to `situation: outcome` in domain words.
- **Custom hooks** (session 17): a `use…` function that calls hooks; moving code into one changes nothing at runtime. Extracted `useHealth` into `src/hooks/` correctly. Installed React DevTools (Components tab shows the hook as `Health`). Not yet used: `useEffectEvent` (stale callback in a once-only effect), `useCallback` for a stable returned function — introduced together and overloaded; reintroduce one at a time.
- **JSDoc and comment content:** asked unprompted whether comments should be `/** */` for hover. First drafts restated the function name; a good comment says *why* or the non-obvious part (units, signed gap). Claude wrote the final wording on request.
- **Pure functions for testability:** pass time in (`nowMs`) and pass YouTube state as a boolean, so the function never reads the clock or `YT`.
- **`never` exhaustive switch:** saw `tsc` flag the `default` after temporarily adding `'ended'`.
- **YouTube replaces the target element:** put the buttons inside `<div id="player">`, and the iframe swap wiped them. Found it from the diff and a guiding question.
- **Chrome autoplay policy:** a `playVideo()` from a received message is blocked until the tab has had one click. Confirmed it with a with/without-click test.
- **`git commit --amend`** for an unpushed commit that missed files; every commit should build on its own.
- **`setInterval` / `clearInterval`**: second use (the `sync` tick) written right first try, reusing `timerRef` because `stopTimer()` already runs on every state change.
- **Echo guard ("only send news")**: compare an outgoing send to the last agreed state (`{state, position, at}`), projecting position while playing. Session 15: asked unprompted whether a `sync` should go through `sendAction` (no: the guard would drop it), i.e. reports vs news. Called `lastStateRef` "shared source of truth between the 2 browsers"; corrected: each tab has its own note, they can differ briefly.
- **Sync design (tick frequency, "ahead wins")**: asked how to choose the interval; framing "interval = longest an undetected drift lasts" + trade-off table landed.
- **Guards over enums:** wrote `=== PAUSED` where the decision was `!== PLAYING`; a per-state table (buffering / ended / unstarted) showed the unstarted tab would auto-start. Recheck: when writing a guard, list every state it lets through.
- **Testing a hypothesis with logs:** guessed "seek fires no event", logged every `onStateChange`, found it holds only while paused. Asked "why did it buffer this time?", and then saw it doesn't always.
- **Refactor habits:** a helper inside the effect (keeps `exhaustive-deps` quiet); named constants with unit suffixes (`_S`, `_MS`); Prettier (`format`, `format:check`).
- **Browser `WebSocket`:** `new WebSocket(relativeUrl)`, `onmessage`, `close()` in effect cleanup. Wrote it right first try.
- **`JSON.stringify` / `JSON.parse`** (Jackson table): put `onmessage` inside the YT player's `events` first. One guiding question ("which object fires `onmessage`?") fixed it.
- **TS literal union types** (`'playing' | 'paused'`), a `type` for the message, **guard-clause early return**: wrote them unprompted. A TS type is unchecked at runtime (unlike a Java cast); `JSON.parse` returns `any`.
- **StrictMode double-mount:** "React shenanigans" → found `<StrictMode>` in `main.tsx` from a pointer. Reasoned that without cleanup, tab 2 gets room full (4005).
- **Backend (M2), details in `docs/learning-archive.md`:** goroutine per connection, sentinel errors, `defer`, `sync.Mutex`, who logs an error, close codes, WebSocket handshake, Go deps; heartbeat and WebRTC signaling planned only.
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
- **Echo guard = "only send news"** in `sendAction` against `lastStateRef`; **`sync` tick** = `sendSync` every 2 s while playing, apply only while playing and only if partner is >1 s ahead, every send/apply writes the note (full design in `ROADMAP.md` M3).
- **Sync decisions live in `src/sync.ts`** as pure functions (`expectedPosition`, `isNews`, `shouldCatchUp`), tested in `src/sync.test.ts`.
- **Vitest** for frontend tests: `bun run test` (`vitest run`).
- **4-hook split of `App.tsx`:** `useHealth`, `useRoomSocket` (socket only, returns stable `send`), `useYouTubePlayer` (player + timers, emits callbacks), `useSync` (owns `lastStateRef` and the sync policy, composes the other two). One file each in `src/hooks/`. Why: each hook has one reason to change; player and socket never see each other. Rejected: 2 hooks passing refs to each other (coupled, sync rules split).
- **`JSON.parse` guard + `send` readyState check** scheduled in `ROADMAP.md` M4.

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
- Session 15: pushes back with good design questions. Answer directly with a small diagram. Bugs from **things outside the diff**: "your diff only touches X, the symptom is in Y" plus a with/without test landed fast.
- Session 16: a **"break it on purpose" mutation list** after each test step worked well: it showed concrete missing tests better than describing them. When they ask for help finishing tests, writing the rest is fine (test-only, they wrote the first ones).
- **Session 17: information overload.** The `useRoomSocket` step bundled `useEffectEvent` + `useCallback` + skeleton + 4 wiring edits + 3 checks; they stopped the session. Split hook work into turns: (1) move code into the hook, (2) wire into App + verify, (3) add the next concept alone. The hook-split proposal (diagram + table + one alternative) was fine.

## Next step

**M3 cleanup step 3, hook 2 of 4: `useRoomSocket`** (`useHealth` done; 7 commits not pushed). Take it in small turns, one concept each: first move the socket open/close into the hook with `code` as a parameter, then wire into App, then `useEffectEvent` for `onMessage`, then `useCallback` for `send`. After that: `useYouTubePlayer`, `useSync`, then tick M3.
