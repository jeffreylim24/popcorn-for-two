# Learning Snapshot

_Last updated: 2026-10-16 (session 21)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch; Java → Go tables work. Used once each in real code:
  - Session 7: `func`, `for` forms (no `while`), `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, `string(s[i])`, `rand.IntN`.
  - Session 8: **route wildcards** `"GET /api/rooms/{code}/ws"` + `r.PathValue("code")`.
  - Session 9: **`for {}` read loop**; **closures vs top-level funcs**; **typed named constants**.
  - Sessions 10–11: **set idiom `map[K]bool`**, nested maps, **`for k := range m`**. Ranging a nil map is safe.
  - Session 21: **returning an `http.Handler` from a func** (closure over `files` / `fileServer`), `http.HandlerFunc(...)`: filled the blanks unaided.
- **`context.Context`:** landed (tentatively) as **"a stop button the caller holds; the function only watches it"**. Earlier tries: `Done()` channel + `select` + ctx tree (got `cancel()`, not the big picture). Recheck on the heartbeat `Ping(ctx)`: have them pick the parent + timeout and say who holds the button.
- **`useRef` (read at call time vs copy early):** weakest React idea. Tried: Java instance-field table, read-at-fire-time trace, **"`send` holds the box, not what's in it"** + timeline (box: A → null → B). Don't quiz it cold. **Recheck in the `readyState` step:** the check reads `socketRef.current` at call time; ask then why that sees the current socket.
- **TS types vanish at runtime:** knew it in theory, but wrote `typeof v.type !== SyncMessage['type']` (session 21). Explained with a "what you write vs what the browser runs" table + `typeof` only returns broad names. Then asked the right follow-up unprompted: "isn't hard-coding the values bad practice?" → `as const` array as the one source, types derived (`(typeof X)[number]`); shown on a `COLORS` example. **Claude wrote the `SyncMessage` version at their request; not explained back.**
- **HTTP:** once mixed up the page URL (`/room/CODE`) with the API URL; `fmt.Fprint(w, …)` writes the response, `log` writes your terminal.

### Learning (introduced, used or explained back once)
- **Hosting constraints (session 21):** asked what serverless breaks; said "the room may close halfway" (half). Missed: several copies = several `rooms` maps, so the partner's join can miss the room. Applied it later themselves via `--ha=false`. Asked "B seems more robust?" → shown that Go is the single point of failure either way; B's real upside is frontend deploys not restarting Go.
- **Docker (session 21):** had used it, but AI always set it up. Thought a container is "a VM of sorts" → corrected: an isolated process on the host OS, no guest OS (two-line diagram). Wrote the 3-stage Dockerfile from blanks. **`COPY` source** needed two hints (`COPY . .` → `./frontend`; a folder source copies its *contents*). Also: `.dockerignore` (like `.gitignore` for `COPY`), `--target` to build one stage, `CGO_ENABLED=0` static binary, `COPY --from=<stage>`, `-p 8080:8080`.
- **Fly.io (session 21):** `fly auth login` (website login ≠ CLI token), `fly launch --no-deploy`, `fly.toml` (`internal_port`, `force_https`, auto-stop, `[[vm]]`), `fly deploy --ha=false`, `fly status`, `fly logs`. `curl -X POST https://…/api/rooms` (https: `force_https` redirects plain http).
- **SPA fallback (session 21):** `http.FileServer` 404s on `/room/CODE` (not a file); Vite did the fallback in dev. Wrote `spaHandler`. Why `http.Dir.Open` over `os.Open` (blocks `../` escapes) was told, not checked.
- **Untrusted input / version skew (session 21):** `unknown` vs `any`; try/catch around `JSON.parse`; shape check. Suggested `position >= 0` themselves, and tested the `0` boundary.
- **Custom hooks + rules of hooks** (s. 17–20): React matches hooks by **slot position, not name**. Wrote `useHealth`, `useRoomSocket`, the `useYouTubePlayer` move. Why hooks (one feature split across lifecycle methods; reuse of stateful logic) was explained, not checked.
- **Function identity / `useEffectEvent` / `useCallback`:** a new inline arrow in deps reopens the socket every render (answered right). Recheck still open: "once `sendAction` reads a changing value, what does the player call without vs with `useEffectEvent`?"
- **JSDoc and comment content:** say *why* or the non-obvious part (units, signed gap, version skew), not the function name.
- **`setInterval` / `clearInterval`**, **echo guard ("only send news")**, **sync design ("ahead wins")**, **guards over enums** (recheck: list every state a guard lets through), **refactor habits** (named constants with unit suffixes, Prettier).
- **Browser `WebSocket`**, **`JSON.stringify` / `JSON.parse`**, **TS literal unions / guard clauses**, **StrictMode double-mount**.
- **Backend (M2), details in `docs/learning-archive.md`:** goroutine per connection, sentinel errors, `defer`, `sync.Mutex`, close codes, WebSocket handshake, Go deps.
- **HTTP statuses**, **effect cleanup**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` loading races**, **deps vs devDeps / lockfiles**, **`net/http` basics**, **CORS / Vite proxy**, **`response.ok`**, **`useState`/`useEffect`**, **message contracts**.

### Solid
- **Unit tests with Vitest:** session 21 wrote 8 `parseSyncMessage` tests unprompted, `toEqual` vs `toBe` right, one per guard after a break-it run showed a gap, plus the `0` boundary. Names: `situation: outcome`.
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case.**
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, false-leave risk, single responsibility, one source of truth for allowed values.
- **Errors as return values**; log-and-continue when the error is someone else's.
- Git: checking a commit before pushing, four areas, `status -sb`, upstream; Conventional Commits (`feat`/`fix`/`build`); one logical change per commit; selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; shadcn/ui + Tailwind; Bun; ESLint; no React Compiler. Keep StrictMode.
- **Backend:** Go, flat layout until there are several programs. Run `go vet ./...` before committing Go.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. Ports: Vite 5173, Go 8080; Vite proxies `/api` (with `ws: true`).
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand (M4); CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. No `Co-Authored-By: Claude` on the user's own code commits.
- **Raw YouTube IFrame API, no React wrapper:** sync is imperative; the echo loop needs control.
- **WebSocket library `coder/websocket`:** concurrent writes allowed, `Ping(ctx)` for the heartbeat.
- **All per-milestone design calls are in `ROADMAP.md`** (M2 rooms, M3 sync + 4-hook split + option A, M4 hosting).
- **Hosting (M4):** Fly.io, one always-on 256 MB machine in `yyz`, `--ha=false`. Why: long-lived sockets + in-memory rooms need one long-running process.
- **One origin (M4):** Go serves `frontend/dist` with an SPA fallback. Why: relative URLs just work, no CORS. Cost: every deploy restarts Go and wipes live rooms.
- **Map-touching helpers are top-level funcs with `Lock()` + `defer Unlock()`**; the long-running handler never holds the lock.
- **Logs:** lifecycle and error logs only; no per-message log.
- **Keep YouTube's own controls;** paused seeks caught by a 500 ms position check.
- **Prettier** (pinned exact, single quotes, no semicolons). Formatting commits stay separate from logic commits.
- **Sync rules and message parsing live in `src/sync.ts`** as pure functions, tested with Vitest (`bun run test`).
- **Code-quality pass deferred** (session 20). Root README comes out of M4; Go tests for join/leave/full during or after M4.

## Open questions

- Per-milestone design questions live in `ROADMAP.md`.
- Worldwide users (one region adds latency far away): room-based routing to regional machines (`fly-replay`) vs shared state. Offered to add to `ROADMAP.md` as post-MVP; not answered yet.

## Teaching formats

- Works: **comparison tables**, **traces with state after each line**, **two-column timelines**, **slot/box diagrams**, **ASCII flow diagrams** (one origin vs separate; request → file exists?), **concrete everyday analogies** after mechanism explanations don't land. Ask "what do you remember?" first.
- Works: **fill-in-the-blank skeletons** (Dockerfile stages, `spaHandler`: both landed); **guiding question about a concrete case**; **options table + one recommendation + "which one?"**. Show rejected alternatives.
- **Session 21 pace worked:** "keep it moving, one step per turn, exact commands, no quizzes on small stuff". Each turn: why (2–3 lines) → exact commands → "it worked if…". They then ask good design questions on their own ("more robust?", "what about users worldwide?", "isn't hard-coding bad practice?"). Answer those fully; they're where the learning happens.
- **Check facts before asserting:** an overstated auto-stop claim had to be corrected. Say "unverified" when it is.
- **Doesn't work: compound or re-asked questions.** One open thing; state settled facts as settled.
- **Give exact commands every time** (which terminal, what to run, what to look at).
- **They run ahead** (wrote tests before being asked): review the full diff; flag design changes with a scenario + trade-off table.
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- **Don't record a decision until they say so**: a "should we?" question is not a yes.
- Asks Claude to write type-level / mechanical parts ("can you do this part"); fine under the exception; keep concept steps theirs.
- When tired, stops answering rechecks; put rechecks inside real feature steps, not review sessions.
- **"Break it on purpose" only after Vitest test steps** (session 21: found the untested type check).

## Next step

**Continue M4: fix 2, the `readyState` check.** `WebSocket.send()` throws while the socket is still connecting; `send` in `useRoomSocket.ts` should check `socketRef.current?.readyState === WebSocket.OPEN` first. Use it for the `useRef` recheck (why does `send` see the current socket?). Then `fly deploy`, `fly status` (still one machine), and the real test: a session with their partner (Montreal ↔ Toronto) on FaceTime. That ticks M4. Then the root README.
