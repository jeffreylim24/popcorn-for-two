# Learning Snapshot

_Last updated: 2026-10-17 (session 29)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch; Java → Go tables work. Used once each in real code:
  - Session 7: `func`, `for` forms (no `while`), `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, `string(s[i])`, `rand.IntN`.
  - Session 8: **route wildcards** `"GET /api/rooms/{code}/ws"` + `r.PathValue("code")`.
  - Session 9: **`for {}` read loop**; **closures vs top-level funcs**; **typed named constants**.
  - Sessions 10–11: **set idiom `map[K]bool`**, nested maps, **`for k := range m`**. Ranging a nil map is safe.
  - Session 21: **returning an `http.Handler` from a func**, `http.HandlerFunc(...)`: filled the blanks unaided.
  - Session 24: **one package across several files**, unused imports are compile errors, `go test -count=1`, `foo_test.go` next to `foo.go`. Told, not checked back.
- **`context.Context`:** landed (tentatively) as **"a stop button the caller holds; the function only watches it"**. Earlier tries: `Done()` channel + `select` + ctx tree. Recheck on the heartbeat `Ping(ctx)`: have them pick the parent + timeout and say who holds the button.
- **`useRef` (read at call time vs copy early):** weakest React idea. Tried: Java instance-field table, read-at-fire-time trace, **"`send` holds the box, not what's in it"** + timeline. Wrote the `readyState` guard right (s. 22). **S. 29:** wrote `videoRef` + an effect setting `srcObject` on `[stream]` unaided, guard included. Still unchecked: the *read-later* side (a ref read inside a callback).
- **Effect cleanup timing / "which code runs later" (s. 22, 26, 28, 29):** s. 28 landed `socket.onclose = null` via the `button.onclick = null` example. S. 29 wrote `useCamera` with a `cancelled` flag, but four slips, all the same gap (*which lines run now vs after the `await`*):
  1. On `cancelled`, returned without stopping the late stream. The trace table → "i don't get it"; the **pizza / note-on-the-door analogy** landed at once.
  2. Put `try` around the call `start()`, not around the `await` inside it (an async call returns at once). The lint `set-state-in-effect` caught it.
  3. Put `setError(null)` inside `if (ownStream)`, which is null exactly when blocked, despite a warning.
  4. Put `if (cancelled) return` in the cleanup, not the `catch`; asked "what does this do?" A two-branch `await` diagram (success / fail) fixed it.
  Next time, try a different format: have them **label each line "now" or "later"** in a small async function before writing.
- **TS types vanish at runtime:** wrote `typeof v.type !== SyncMessage['type']` (s. 21). Explained with a "what you write vs what the browser runs" table. Not explained back.
- **HTTP:** once mixed up the page URL (`/room/CODE`) with the API URL; `fmt.Fprint(w, …)` writes the response, `log` writes your terminal.

### Learning (introduced, used or explained back once)
- **Lifting state up (s. 29):** chose "owner never unmounts" for the stream, and the lobby as a view at the same URL. Delegated the `RoomPage` / `RoomView` split (dense: rename + new component + props); then wired `cameraOn` / `onToggleCamera` into `RoomView` themselves, following the TS "missing props" error.
- **Hooks in a child that mounts later (s. 29):** `useSync` in `RoomView` means the socket opens only after Join. Told, not explained back.
- **Re-run an effect by changing a dep (s. 28, 29):** `attempt` counter (s. 28); the camera toggle as `useCamera(enabled)` (s. 29), chosen over `start`/`stop`. wrote the `attempt` counter + `[code, attempt]` + `useCallback` reconnect from a flow diagram. First forgot `setStatus('connecting')`; the "button looks broken if it fails again" case landed. Updater form `setX(prev => …)` used.
- **Lookup table typed `Record<Union, …>` (s. 28):** asked Claude to write the status overlay; shown a trace. Then added the `action` field themselves, letting TS errors guide the rows. Asked whether union strings count as hard-coding: told the union type-checks them, unlike `4004`.
- **`useState` in a custom hook (s. 28):** status union + `useState`, returned up through `useSync`. Logging in the hook body (each render) vs after `setX` (old value): told.
- **Close codes on the client (s. 28):** `onclose` + `e.code` switch, left a TODO about sharing codes with Go.
- **`async` / `await` in an effect (s. 26, 29):** `useCamera` rewritten with `try`/`catch` and a `DOMException` `.name` check. Gap: `try` only catches what's awaited inside it (see cleanup entry).
- **Rules of hooks → component split (s. 26–27):** removed the dead `code: string | undefined` guards themselves. Why tighter types help: told.
- **Go `testing` package (s. 23):** wrote 6 room tests from skeletons; `t.Fatalf` vs `t.Errorf`.
- **Safe refactor loop (s. 23–24):** baseline tests → move → vet/test/gofmt → smoke test → one `refactor:` commit. S. 28: extracted `createAndJoinRoom` to `src/rooms.ts` and split refactor and feat commits, refactor first so each builds.
- **Browser `WebSocket` + `readyState` (s. 22):** wrote the guard unaided.
- **Custom hooks + rules of hooks** (s. 17–20): slot position, not name.
- **Function identity / `useEffectEvent` / `useCallback`:** recheck still open: "once `sendAction` reads a changing value, what does the player call without vs with `useEffectEvent`?"
- **JSDoc and comment content:** say *why*. Updates stale JSDoc when reminded.
- **`setInterval`**, **echo guard**, **sync design ("ahead wins")**, **guards over enums**, **`JSON` parse/stringify**, **TS literal unions**, **StrictMode double-mount**.
- **Backend (M2), deploy (M4), M5 detail in `docs/learning-archive.md`.**
- **HTTP statuses**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` races**, **deps vs devDeps**, **`net/http`**, **CORS / Vite proxy**, **`response.ok`**, **message contracts**.

### Solid
- **Unit tests with Vitest:** wrote 8 `parseSyncMessage` tests unprompted, `toEqual` vs `toBe` right.
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case.** **Manual test plans** (not-found, full, server stopped, throttled network).
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, false-leave risk, single responsibility, one source of truth for allowed values.
- **Errors as return values**; log-and-continue when the error is someone else's.
- **Deploying by hand:** commit → push → `fly deploy --ha=false` → `fly status`, unprompted.
- Git: four areas, upstream, Conventional Commits, one logical change per commit, selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; Tailwind v4 + shadcn/ui; Bun; ESLint; Prettier (single quotes, no semicolons); no React Compiler; keep StrictMode.
- **Backend:** Go, flat layout; `coder/websocket`; map helpers lock + `defer Unlock()`. `go vet ./...` before committing Go.
- **Repo:** monorepo, Conventional Commits, straight to `main`. Docs + commit messages are Claude's; the user stages, commits, pushes.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8, TS 6. Ports 5173 / 8080; Vite proxies `/api` (`ws: true`).
- **Roadmap:** M1–M9 in `ROADMAP.md`, pull-by-need; per-milestone design calls live there.
- **Raw YouTube IFrame API**, YouTube's own controls. Sync rules in `src/sync.ts`, tested.
- **Hosting:** Fly.io, one machine in `yyz`, `--ha=false`. Rooms in memory: a deploy or restart wipes them.
- **Styling is delegated:** Claude writes visual work on request (cream / cocoa / terracotta, Pixelify Sans headings, lucide icons). App logic stays theirs.
- **Reordered (s. 26):** M5 routing → M6 status → M7 camera → M8 drag → M9 call; they want visible feedback over console debugging.
- **M5 (s. 27):** path matched by hand in `App`, soft 404, pages in `src/pages/`.
- **M6 (s. 28):** status lives in `useRoomSocket` (`{ send, status, reconnect }`); overlay drawn *over* the player (YouTube holds `#player`); `STATUS_TEXT: Record<RoomStatus, …>` holds title, detail, action; Create (not-found / full) and manual Reconnect, no auto-retry.
- **M7 (s. 29):** lobby is a `joined` view inside `RoomPage` (no router: a URL change kills the stream); `useCamera(cameraOn)` lives in `RoomPage`; toggles in lobby + room header; toggle off hides the blocked box. `pages/` holds only routed pages; views go in `components/`.
- **The app is public:** many couples' rooms; weigh SEO, abuse, scaling.
- **Deferred to "Later":** room expiry, bfcache ghost seat (`pagehide`), auto-retry with backoff, shared close-code constants, CI/CD, code-quality pass. Font preload for Pixelify Sans (slow-network flash). `useHealth.ts` unused (their call).

## Open questions

- Worldwide users: room-based routing (`fly-replay`) vs shared state. Post-MVP; not answered.

## Teaching formats

- Works: **comparison tables**, **traces with state after each line**, **two-column timelines** (the two-socket one landed), **ASCII flow diagrams**, **concrete analogies** when mechanism explanations don't land. Ask "what do you remember?" first.
- Works: **fill-in-the-blank skeletons**; **options table + recommendation** (AskUserQuestion with three design calls settled M6 in one turn).
- **"I don't get what you're getting at" / "i don't get it":** abstract hints and trace tables for async timing fail. Give the **same idea on a different concrete object** (`button.onclick = null`), then map it back. Landed in s. 28 (`onclick`) and s. 29 (pizza courier).
- **Step 5 in s. 28 was too dense** (keep-mounted + `Record` + conditional render + styling) → "just do it for me". Split steps like that.
- **Fast pace:** one step per turn, why → exact commands → "it worked if…". On "done", verify with `git diff`, lint, build. They often commit/push/deploy ahead: check `git log` first.
- **Visual work:** they give a reference or ask "help me style"; give classes directly. They notice font mismatches.
- **Asks sharp "is this OK?" questions** (hard-coded strings, where state lives). Answer with a table + where the real concern is.
- **Debugging by "paste the log".** **They prune scope and redefine milestones**; record it.
- **A warning in the same message gets missed** (s. 29, twice): put the trap in the step itself ("put it *outside* the `if`"), or make it its own step.
- **Doesn't work:** compound or re-asked questions; abstract questions; predicting output; sending to docs to learn a step.
- **Don't record a decision until they say so.** Delegates mechanical, visual and dense steps; explain with a trace afterwards; keep small logic steps theirs.
- When tired, stops answering rechecks; put rechecks inside real feature steps. **"Break it on purpose" only after Vitest steps.**

## Next step

**M8: Pick a video** (inserted, s. 29; decisions in `ROADMAP.md`). First step (given, not started): `parseVideoId(link)` in `src/youtube.ts` using `new URL()`, with Vitest tests for watch / youtu.be / shorts / m. links and junk → `null`. Then **M9: Drag and resize.** M7 is done and deployed (lobby, corner self-view, toggles, blocked box). At the start of M8, settle: pointer events + `setPointerCapture` vs mouse events (the iframe swallows moves); where the box's position/size lives (state in `SelfView` vs `RoomPage`) and whether it's pixels or % of the player; whether to keep the box clear of YouTube's control bar. Good spot to recheck the "now vs later" gap: a `pointermove` handler reading a ref.
