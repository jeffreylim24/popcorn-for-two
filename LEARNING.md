# Learning Snapshot

_Last updated: 2026-10-16 (session 24)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch; Java → Go tables work. Used once each in real code:
  - Session 7: `func`, `for` forms (no `while`), `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, `string(s[i])`, `rand.IntN`.
  - Session 8: **route wildcards** `"GET /api/rooms/{code}/ws"` + `r.PathValue("code")`.
  - Session 9: **`for {}` read loop**; **closures vs top-level funcs**; **typed named constants**.
  - Sessions 10–11: **set idiom `map[K]bool`**, nested maps, **`for k := range m`**. Ranging a nil map is safe.
  - Session 21: **returning an `http.Handler` from a func** (closure over `files` / `fileServer`), `http.HandlerFunc(...)`: filled the blanks unaided.
  - Session 24: **one package across several files** (no imports between them), unused imports are compile errors, `go test -count=1` skips the test cache, `foo_test.go` sits next to `foo.go`. Told while doing the split; not checked back.
- **`context.Context`:** landed (tentatively) as **"a stop button the caller holds; the function only watches it"**. Earlier tries: `Done()` channel + `select` + ctx tree (got `cancel()`, not the big picture). Recheck on the heartbeat `Ping(ctx)`: have them pick the parent + timeout and say who holds the button.
- **`useRef` (read at call time vs copy early):** weakest React idea. Tried: Java instance-field table, read-at-fire-time trace, **"`send` holds the box, not what's in it"** + timeline (box: A → null → B). Session 22: wrote the `readyState` guard on `socketRef.current` correctly, but the recheck ("`send` is made once; how does it see the later socket?") went unanswered. Don't re-ask it; fold it into the `pagehide` fix (the listener closes `socketRef.current`).
- **Effect cleanup vs page lifecycle (session 22):** said "idk" to why cleanup didn't run when the page went into the bfcache. Given: cleanup runs only on unmount / deps change; a frozen page is "paused movie, not TV off"; `pagehide` comes from the browser, not React. Plus the `addEventListener` / `removeEventListener` (same function) syntax on a `resize` example. Fix deferred; check it when they do it.
- **`async` / `await` + `fetch` POST (session 22):** didn't know the syntax; Claude wrote `createAndJoinRoom` at their request and explained it (promise, two awaits: headers then body, `response.text()`, hooks before the early return). Not explained back.
- **TS types vanish at runtime:** knew it in theory, but wrote `typeof v.type !== SyncMessage['type']` (session 21). Explained with a "what you write vs what the browser runs" table. Then asked "isn't hard-coding the values bad practice?" → `as const` array as the one source, types derived. **Claude wrote the `SyncMessage` version at their request; not explained back.**
- **HTTP:** once mixed up the page URL (`/room/CODE`) with the API URL; `fmt.Fprint(w, …)` writes the response, `log` writes your terminal.

### Learning (introduced, used or explained back once)
- **Go `testing` package (session 23):** wrote 6 room tests (now `backend/rooms_test.go`) from comment skeletons: `TestXxx(t *testing.T)`, `go test ./...` / `-v`, `errors.Is` in asserts, `&websocket.Conn{}` as a fake map-key conn, fresh `createRoom()` per test for isolation. First discarded setup errors with `_` (shown: a broken cap could pass falsely); fixed. Asked what `t.Fatalf` is: explained with a 3-line failure trace (setup → `Fatalf`, real checks → `Errorf`). Checked both directions in the partner test unprompted.
- **Safe refactor loop (sessions 23–24):** tests first, then the split, one file per step: baseline `go test` → cut/paste → `go vet` + `go test -count=1` + `gofmt -l` → `curl` smoke test of the routes (tests don't cover `main.go` wiring) → `git mv` for the test rename → one `refactor:` commit. Did all of it smoothly; hasn't said back *why* the smoke test was needed.
- **Debugging a server-side ghost (session 22):** found the bfcache bug themselves (edit URL in a room tab → room stuck "full"). Followed the process: Go log showed no `left` line → Go never saw a close → tested the bfcache theory by closing the tab (confirmed). Good habit: reported exact repro steps.
- **Dev vs prod serving (session 22):** asked to test on `:8080` instead of `:5173`, unprompted. Told: 8080 serves the last `bun run build`, matches production; 5173 for editing.
- **Hosting constraints (session 21):** half-got serverless (missed: several copies = several `rooms` maps). Applied `--ha=false` themselves. Go is the single point of failure either way.
- **Docker (session 21):** a container is an isolated process, not a VM. Wrote the 3-stage Dockerfile from blanks; `COPY` source needed two hints. Also `.dockerignore`, `--target`, `CGO_ENABLED=0`, `COPY --from`, `-p`.
- **Fly.io (sessions 21–22):** `fly auth login`, `fly launch --no-deploy`, `fly.toml`, `fly deploy --ha=false`, `fly status` (read it right: one machine, `started`, `yyz`), `fly logs`.
- **SPA fallback (session 21):** wrote `spaHandler`. Why `http.Dir.Open` over `os.Open` was told, not checked.
- **Untrusted input / version skew (session 21):** `unknown` vs `any`; try/catch around `JSON.parse`; shape check; suggested `position >= 0` themselves.
- **Browser `WebSocket` + `readyState` (session 22):** wrote the guard unaided, compared against `WebSocket.OPEN` (not `1`).
- **Custom hooks + rules of hooks** (s. 17–20): slot position, not name. Wrote `useHealth`, `useRoomSocket`, the `useYouTubePlayer` move.
- **Function identity / `useEffectEvent` / `useCallback`:** recheck still open: "once `sendAction` reads a changing value, what does the player call without vs with `useEffectEvent`?"
- **JSDoc and comment content:** say *why* or the non-obvious part, not the function name.
- **`setInterval` / `clearInterval`**, **echo guard**, **sync design ("ahead wins")**, **guards over enums**, **refactor habits** (named constants with unit suffixes, Prettier).
- **`JSON.stringify` / `JSON.parse`**, **TS literal unions / guard clauses**, **StrictMode double-mount**.
- **Backend (M2), details in `docs/learning-archive.md`:** goroutine per connection, sentinel errors, `defer`, `sync.Mutex`, close codes, WebSocket handshake, Go deps.
- **HTTP statuses**, **effect cleanup**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` loading races**, **deps vs devDeps / lockfiles**, **`net/http` basics**, **CORS / Vite proxy**, **`response.ok`**, **`useState`/`useEffect`**, **message contracts**.

### Solid
- **Unit tests with Vitest:** wrote 8 `parseSyncMessage` tests unprompted, `toEqual` vs `toBe` right, `situation: outcome` names.
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case.**
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, false-leave risk, single responsibility, one source of truth for allowed values.
- **Errors as return values**; log-and-continue when the error is someone else's.
- Git: checking a commit before pushing, four areas, `status -sb`, upstream; Conventional Commits; one logical change per commit; selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; shadcn/ui + Tailwind; Bun; ESLint; no React Compiler. Keep StrictMode.
- **Backend:** Go, flat layout until there are several programs. Run `go vet ./...` before committing Go.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. Ports: Vite 5173, Go 8080; Vite proxies `/api` (with `ws: true`).
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand (M4); CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. `Co-Authored-By: Claude` only on code Claude wrote.
- **Raw YouTube IFrame API, no React wrapper:** sync is imperative; the echo loop needs control.
- **WebSocket library `coder/websocket`:** concurrent writes allowed, `Ping(ctx)` for the heartbeat.
- **All per-milestone design calls are in `ROADMAP.md`** (M2 rooms, M3 sync, M4 hosting, one origin, Create room button).
- **Hosting (M4):** Fly.io, one always-on 256 MB machine in `yyz`, `--ha=false`. Why: long-lived sockets + in-memory rooms need one process.
- **Map-touching helpers are top-level funcs with `Lock()` + `defer Unlock()`**; the long-running handler never holds the lock.
- **Logs:** lifecycle and error logs only; no per-message log.
- **Keep YouTube's own controls;** paused seeks caught by a 500 ms position check.
- **Prettier** (pinned exact, single quotes, no semicolons). Formatting commits stay separate.
- **Sync rules and message parsing live in `src/sync.ts`** as pure functions, tested with Vitest.
- **Deferred to "Later" in `ROADMAP.md`:** room expiry, the bfcache ghost seat (`pagehide`), CI/CD. Code-quality pass deferred.
- **Backend files (session 24):** `main.go` (routes only), `rooms.go` (map, lock, room logic), `handlers.go` (HTTP + WebSocket), `spa.go`, `rooms_test.go` (6 tests). Same `package main`. Why: room logic and its lock rules in one place; handlers only call into it.
- **Root `README.md` is Claude's to write** (session 23): the user wants the what and why, not to draft prose.

## Open questions

- Per-milestone design questions live in `ROADMAP.md`.
- Worldwide users (one region adds latency far away): room-based routing (`fly-replay`) vs shared state. Offered to add to `ROADMAP.md` as post-MVP; not answered yet.

## Teaching formats

- Works: **comparison tables**, **traces with state after each line**, **two-column timelines**, **slot/box diagrams**, **ASCII flow diagrams**, **concrete everyday analogies** after mechanism explanations don't land. Ask "what do you remember?" first.
- Works: **fill-in-the-blank skeletons**; **guiding question about a concrete case**; **options table + one recommendation + "which one?"**.
- **Fast pace works (sessions 21–24):** one step per turn, why (2–3 lines) → exact commands → "it worked if…". They ask good design questions on their own; answer those fully. When they reply just "done", verify with read-only checks (`git status`, `go vet`, `go test`) instead of asking for output.
- **Debugging by "paste the log":** asking for the whole server log after a clean repro worked well; the log answered the first question by itself.
- **They prune scope:** skipped "Copy link" (address bar works), deferred the bfcache fix. Respect it; log the deferral in `ROADMAP.md`.
- **"idk" to a guiding question:** go to a conceptual hint + the syntax shown on a *different* example. Unknown syntax is often the real blocker.
- **Check facts before asserting:** looked up the Chrome 149 bfcache change before claiming it. Say "unverified" when it is. (Session 24 slip: claimed `(cached)` meant a failed move; it doesn't. Corrected next turn.)
- **Doesn't work: compound or re-asked questions.** One open thing; state settled facts as settled.
- **They run ahead:** review the full diff; flag design changes with a scenario + trade-off table.
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- **Don't record a decision until they say so.**
- **Docs prose: they don't want to write it.** Write it, then explain each section's what + why in one line.
- Asks Claude to write unfamiliar-syntax parts ("can you do this part"); fine under the exception; keep concept steps theirs.
- When tired, stops answering rechecks; put rechecks inside real feature steps.
- **"Break it on purpose" only after Vitest test steps.**

## Next step

**Tailwind + shadcn/ui setup, then make the home page look nicer** (styling fast lane: give classes directly; setup commands are still theirs). Already explained: Tailwind = utility classes in JSX; shadcn copies component source into the repo. Three steps, from the shadcn Vite "existing project" docs:
1. `bun add tailwindcss @tailwindcss/vite`, add `tailwindcss()` to `plugins` in `vite.config.ts`, replace all of `src/index.css` with `@import 'tailwindcss';`. Check: a temporary `text-red-500` turns a heading red. (Given in session 24, not started.)
2. `@/*` alias: `paths` in `tsconfig.json` + `tsconfig.app.json`, `resolve.alias` in `vite.config.ts`. **TS 6 errors on `baseUrl`** (TS5101): use `"@/*": ["./src/*"]` without `baseUrl`, unlike the shadcn docs.
3. `bunx --bun shadcn@latest init`, then `add button`; restyle the home page.
**M4 still needs the partner session** (Montreal ↔ Toronto, on FaceTime); tick M4 when they report it.
