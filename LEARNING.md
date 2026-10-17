# Learning Snapshot

_Last updated: 2026-10-16 (session 26)_

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
- **`useRef` (read at call time vs copy early):** weakest React idea. Tried: Java instance-field table, read-at-fire-time trace, **"`send` holds the box, not what's in it"** + timeline. Session 22: wrote the `readyState` guard right, but the recheck went unanswered. Don't re-ask; fold it into the `pagehide` fix. **M7 (camera) is a natural spot:** the `MediaStream` and `<video>` element will live in refs.
- **Effect cleanup vs page lifecycle (s. 22, 26):** said "idk" to why cleanup didn't run in the bfcache. Given: cleanup runs only on unmount / deps change; frozen page = "paused movie, not TV off". S. 26: camera light went off on leaving, but only because the logo is a full page load (Chrome frees the camera on unload), not cleanup. Shown a timeline of **cleanup running before an async result arrives** (StrictMode) → `cancelled` flag + stop late stream. Not written or explained back; redo in M7.
- **TS types vanish at runtime:** wrote `typeof v.type !== SyncMessage['type']` (s. 21). Explained with a "what you write vs what the browser runs" table; `as const` array as one source. Claude wrote it; not explained back.
- **HTTP:** once mixed up the page URL (`/room/CODE`) with the API URL; `fmt.Fprint(w, …)` writes the response, `log` writes your terminal.

### Learning (introduced, used or explained back once)
- **`async` / `await` in an effect (s. 26):** said "I don't know any of the syntax"; given a `fetch` example + fill-in skeleton, wrote `useCamera` correctly (inner `async` function, `try/catch`, guard first, `[code]` deps). Code was deleted for the reorder; the pattern returns in M7.
- **Rules of hooks → component split (s. 26):** asked "shouldn't App do the check?" Told: hooks can't be conditional, so the check lives in the hook; splitting `HomePage`/`RoomPage` removes it. First real step of M5.
- **Reading tutorial code critically (s. 26):** brought two online `useCamera` examples. Told: they're click-driven (`start()`), and both leak a stream that arrives after unmount. Not yet judged one themselves.
- **Tailwind + shadcn setup (s. 25):** did all setup steps smoothly: Tailwind v4 Vite plugin + `@import 'tailwindcss'`; `@/` alias needs **two tools** (TS `paths` for type-checking, Vite `resolve.alias` for the build); shadcn **copies source in** (`components.json`, `cn()`, theme vars in `index.css`); generated code vs project rules (lint override for `components/ui`, Prettier on generated files). Hit TS6258 (`paths` outside `compilerOptions`; Claude's wording was unclear). None explained back; low priority (styling isn't a goal).
- **Testing on real networks (s. 25):** asked whether a VPN can stand in for the partner session. Told: covers HTTPS, real lag, two independent browsers; routers don't matter until WebRTC. Chose to redefine M4's done-when.
- **Go `testing` package (s. 23):** wrote 6 room tests from comment skeletons; `t.Fatalf` (setup) vs `t.Errorf` (checks) via a failure trace.
- **Safe refactor loop (s. 23–24):** baseline tests → move → vet/test/gofmt → curl smoke test → `git mv` → one `refactor:` commit. Hasn't said back *why* the smoke test was needed.
- **Browser `WebSocket` + `readyState` (s. 22):** wrote the guard unaided, compared against `WebSocket.OPEN`.
- **Custom hooks + rules of hooks** (s. 17–20): slot position, not name. Wrote `useHealth`, `useRoomSocket`, the `useYouTubePlayer` move.
- **Function identity / `useEffectEvent` / `useCallback`:** recheck still open: "once `sendAction` reads a changing value, what does the player call without vs with `useEffectEvent`?"
- **JSDoc and comment content:** say *why* or the non-obvious part, not the function name.
- **`setInterval` / `clearInterval`**, **echo guard**, **sync design ("ahead wins")**, **guards over enums**, **refactor habits**.
- **`JSON.stringify` / `JSON.parse`**, **TS literal unions / guard clauses**, **StrictMode double-mount** (M7: camera opened twice in dev).
- **Backend (M2) and deploy (M4) detail in `docs/learning-archive.md`:** goroutines, sentinel errors, `defer`, `sync.Mutex`, close codes, handshake, Docker, Fly, SPA fallback, untrusted input.
- **HTTP statuses**, **effect cleanup**, **`?.`**, **TS signatures**, **YouTube state vs position**, **`<script>` loading races**, **deps vs devDeps / lockfiles**, **`net/http` basics**, **CORS / Vite proxy**, **`response.ok`**, **`useState`/`useEffect`**, **message contracts**.

### Solid
- **Unit tests with Vitest:** wrote 8 `parseSyncMessage` tests unprompted, `toEqual` vs `toBe` right.
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case.**
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, false-leave risk, single responsibility, one source of truth for allowed values.
- **Errors as return values**; log-and-continue when the error is someone else's.
- **Deploying by hand:** commit → push → `fly deploy --ha=false` → `fly status`, unprompted (s. 25).
- Git: four areas, `status -sb`, upstream; Conventional Commits; one logical change per commit (split a `style:` commit off on their own); selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; Tailwind v4 + shadcn/ui (Radix, Nova style); Bun; ESLint; no React Compiler. Keep StrictMode.
- **Backend:** Go, flat layout until there are several programs. Run `go vet ./...` before committing Go.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8, TS 6. Ports: Vite 5173, Go 8080; Vite proxies `/api` (with `ws: true`).
- **Roadmap:** M1–M9 in `ROADMAP.md`, pull-by-need. All per-milestone design calls live there. Deploy by hand; CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. `Co-Authored-By: Claude` only on code Claude wrote.
- **Raw YouTube IFrame API, no React wrapper**; keep YouTube's own controls (debug buttons removed s. 25).
- **WebSocket library `coder/websocket`;** map-touching helpers lock + `defer Unlock()`; handlers never hold the lock.
- **Hosting:** Fly.io, one always-on machine in `yyz`, `--ha=false`. Don't deploy during a date night (wipes rooms).
- **Sync rules and message parsing live in `src/sync.ts`** as pure functions, tested with Vitest.
- **Prettier** (pinned, single quotes, no semicolons). Formatting commits stay separate.
- **Styling is delegated (s. 25):** visual work (the cozy home page, `CozyRoom.tsx`, room page) was written by Claude at their request. Theme: cream / cocoa / terracotta, Pixelify Sans headings, lucide icons (no Unicode symbols: the pixel font lacks them). App logic stays theirs.
- **`@/` alias without `baseUrl`** (TS 6 rejects it); `react-refresh` rule off for `src/components/ui`.
- **M4 done-when changed** to "two devices on separate networks" (VPN test passed). Partner date night still to come; not a blocker.
- **Reordered (s. 26):** on-screen feedback before the camera: M5 pages/routing (exact `/`, `/room/{code}`, else not found; keep the SPA), M6 room status (close codes 4004/4005 on screen), M7 camera with a lobby preview, M8 drag, M9 call. Why: they want to see feedback live instead of debugging in the console. Camera design calls (made earlier this session) moved to M7.
- **Deferred to "Later":** room expiry, the bfcache ghost seat (`pagehide`), CI/CD, code-quality pass. `useHealth.ts` is now unused (their call to delete).

## Open questions

- Worldwide users (one region adds latency far away): room-based routing (`fly-replay`) vs shared state. Offered as post-MVP; not answered yet.

## Teaching formats

- Works: **comparison tables**, **traces with state after each line**, **two-column timelines**, **slot/box diagrams**, **ASCII flow diagrams**, **concrete analogies** after mechanism explanations don't land. Ask "what do you remember?" first.
- Works: **fill-in-the-blank skeletons**; **guiding question about a concrete case**; **options table + one recommendation + "which one?"**.
- **Fast pace works (s. 21–25):** one step per turn, why (2–3 lines) → exact commands → "it worked if…". When they reply "done", verify with read-only checks (`git diff`, lint, build) instead of asking for output. They often commit/push/deploy ahead of the next step: check `git log` before giving commands.
- **Visual work:** they give a reference (screenshot/URL) and want it built. Iterate with headless-Chrome screenshots; they give short concrete feedback ("looks like Arial", "arrow looks off").
- **Debugging by "paste the log":** whole server log after a clean repro answers the first question by itself.
- **They prune scope and redefine milestones** (Copy link, bfcache fix, M4 done-when). Respect it; record it in `ROADMAP.md`.
- **"idk" to a guiding question:** conceptual hint + the syntax on a *different* example.
- **Check facts before asserting;** say "unverified" when it is. Precise wording in config steps ("inside a new `compilerOptions` block", not "next to `files`").
- **Pushes back on structure (s. 26):** questions where checks live and compares against online examples. Answer with the reason + options table; it lands. Wants **visible feedback** over console debugging, and reorders the roadmap for it.
- **Doesn't work:** compound or re-asked questions; abstract questions; predicting output; sending to docs to learn a step.
- **Don't record a decision until they say so.** Docs prose: they don't want to write it.
- Asks Claude to write unfamiliar-syntax or visual parts; fine under the exception; keep concept steps theirs.
- When tired, stops answering rechecks; put rechecks inside real feature steps. **"Break it on purpose" only after Vitest steps.**

## Next step

**M5: Pages and routing.** Done when: `/` → home, `/room/CODE` → room, anything else → "page not found". Settle first: a router library vs matching the path by hand, and whether Go also returns a real `404` status. Then their first code step: split `App` into `HomePage` and `RoomPage` (hooks lose their `code` checks). `useCamera` was deleted (their call; working tree clean).
