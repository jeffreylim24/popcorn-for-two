# Learning Snapshot

_Last updated: 2026-10-17 (session 30)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch. Used once each in real code:
  - S. 7–11: `func`, `for` forms, `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, route wildcards + `r.PathValue`, `for {}` read loop, closures, typed constants, set idiom `map[K]bool`, `for k := range m`.
  - S. 21–24: returning an `http.Handler`; one package across files; `foo_test.go`.
  - **S. 30:** struct type + **`map[string]*room`** (why a pointer: a map hands back a copy); `regexp.MustCompile` at package level; **table tests** (anonymous struct rows); **`json.Unmarshal` / `json.Marshal`** with struct tags (exported = capital). All written by them from pseudocode; told, not explained back.
- **`context.Context`:** landed (tentatively) as **"a stop button the caller holds; the function only watches it"**. S. 30: forgot the timeout on a new `conn.Write` until reminded; then copied the relay's `WithTimeout` + `cancel()` right.
- **`useRef` (read at call time vs copy early):** weakest React idea, improving. S. 29: wrote `videoRef` + `srcObject` effect unaided. **S. 30:** answered "where do you keep the early video ID?" → "a ref" at once, and wrote an `onReady` closure that reads a local `let player` *at fire time*, correctly. Still to see: explaining it back.
- **Effect cleanup / "which code runs later":** s. 29 had four slips (see archive). **S. 30:** set the ref in `onReady` right, but left cleanup destroying `playerRef.current` (null before ready) after a warning in the step, then delegated the fix. Next time: have them **label each line "now" or "later"** before writing.
- **Two kinds of "ready" (s. 30):** guessed `onYouTubeIframeAPIReady` for player-ready. Restaurant analogy: "restaurant open" (script loaded) vs "your table is ready" (`onReady`, this player). Not checked back.
- **Unfamiliar browser APIs (s. 30):** stalled on `new URL()`: "I don't know the shape, or the valid/invalid cases". A table of what `new URL()` returns for each link unblocked it, then delegated. Show the shape *first* next time.
- **TS types vanish at runtime:** wrote `typeof v.type !== SyncMessage['type']` (s. 21). Not explained back.
- **HTTP:** once mixed up the page URL (`/room/CODE`) with the API URL.

### Learning (introduced, used or explained back once)
- **Defensive guards (s. 30):** pushed back on "no guard needed, callers always join first": "each function shouldn't depend on how others call it". Right call; Claude had agreed too fast. Wrote both comma-ok guards.
- **Round-trip tests (s. 30):** asked whether testing a setter via its getter is cheating; told why it's standard. Wrote the Go table tests; first had an inverted `if` (read the failing output to find it) and an unused `wantVideo` column.
- **`test.each` (s. 30):** delegated; the `%s` positional trap shown.
- **Debugging a race (s. 30):** formed a hypothesis ("server forgets"), checked DevTools Network → WS → Messages, pasted the console error. "Is not a function" vs "of null" → the object exists but isn't ready.
- **Naming (s. 30):** spotted `SyncMessage` misleads (covers `action` too) and asked for the rename to `PlaybackMessage`.
- **Hooks in a child that mounts later (s. 29):** `useSync` in `RoomView` opens the socket only after Join. Told.
- **`async` / `await` in an effect (s. 26, 29):** `try` only catches what's awaited inside it.
- **Go `testing` package (s. 23, 30):** `t.Fatalf` vs `t.Errorf`; table tests.
- **Safe refactor loop (s. 23–30):** baseline → change → vet/test/gofmt → smoke → `refactor:` commit before the `feat:`. S. 30: done unprompted for the room struct.
- **Function identity / `useEffectEvent` / `useCallback`:** recheck still open.
- **Custom hooks + rules of hooks**, **`setInterval`**, **echo guard**, **sync design ("ahead wins")**, **JSON parse/stringify**, **TS literal unions**, **StrictMode double-mount**, **browser `WebSocket` + `readyState`**, **JSDoc says why**.
- **M2–M7 detail in `docs/learning-archive.md`.**

### Solid
- **Unit tests with Vitest:** wrote 8 `parseSyncMessage` tests unprompted, `toEqual` vs `toBe` right.
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case.** **Manual test plans:** s. 30 found both the native-validation bubble and the refresh bug from the plan.
- **Design reasoning:** collision risk, server as source of truth, the 2-person cap, single responsibility, one source of truth for allowed values. S. 30: explained why the pending ref can be cleared (the server re-sends on join).
- **Errors as return values**; log-and-continue when the error is someone else's.
- **Deploying by hand:** commit → push → `fly deploy --ha=false` → `fly status`, unprompted.
- Git: four areas, upstream, Conventional Commits, one logical change per commit, selective staging.

## Decisions

- **Frontend:** React + TS + Vite; Tailwind v4 + shadcn/ui; Bun; ESLint; Prettier (single quotes, no semicolons); no React Compiler; keep StrictMode.
- **Backend:** Go, flat layout; `coder/websocket`; map helpers lock + `defer Unlock()`, and guard a missing room. `go vet ./...` before committing Go.
- **Repo:** monorepo, Conventional Commits, straight to `main`. Docs + commit messages are Claude's; the user stages, commits, pushes.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8, TS 6. Ports 5173 / 8080; Vite proxies `/api` (`ws: true`).
- **Raw YouTube IFrame API**, YouTube's own controls. Sync rules in `src/sync.ts`, tested.
- **Hosting:** Fly.io, one machine in `yyz`, `--ha=false`. Rooms in memory: a deploy or restart wipes them.
- **Workflow trial (s. 31):** user writes pseudocode, Claude writes the code once the logic is right (see `CLAUDE.md`). Ask at the end of s. 31: keep it, or go back to the user typing all code.
- **Styling is delegated:** Claude writes visual work (cream / cocoa / terracotta, Pixelify Sans headings, lucide icons). App logic stays theirs.
- **M5–M7:** see `ROADMAP.md` (path matched by hand; status in `useRoomSocket` + `STATUS_TEXT`; lobby view inside `RoomPage`, `useCamera(cameraOn)`).
- **M8 (s. 30):** server stores + validates the video; `VideoMessage` has its own parser; `SyncMessage` → `PlaybackMessage`; player ref set only in `onReady`, early video waits in `pendingVideoRef`. Copy link button. Details in `ROADMAP.md`.
- **The app is public:** many couples' rooms; weigh SEO, abuse, scaling.
- **Deferred to "Later":** room expiry (recheck the room guards then), bfcache ghost seat (`pagehide`), auto-retry with backoff, shared close-code constants, CI/CD, code-quality pass, Pixelify Sans preload. `useHealth.ts` unused (their call).

## Open questions

- Worldwide users: room-based routing (`fly-replay`) vs shared state. Post-MVP; not answered.

## Teaching formats

- Works: **comparison tables**, **traces with state after each line**, **two-column timelines**, **ASCII flow diagrams**, **concrete analogies** (pizza courier, restaurant table) when mechanism explanations don't land. Ask "what do you remember?" first.
- Works: **pseudocode skeletons** (all of s. 30's Go came from them, nearly right first time); **options table + recommendation**.
- **Unfamiliar API → show its shape first** (a table of real outputs) before asking them to write against it. "I keep having to google" = the step was missing that.
- **"i don't get it":** give the same idea on a different concrete object, then map it back.
- **Fast pace:** one step per turn, why → exact commands → "it worked if…". On "done", verify with `git diff`, lint, build, tests. They often commit/push ahead: check `git log` first.
- **Trial workflow (s. 31 only, their call):** they give pseudocode, Claude reviews the logic, then writes the code and maps it back to their lines. Syntax was eating the focus that belongs on logic. Watch: do they read the written code? Offer "you type this one" now and then for syntax recall.
- **Delegation (s. 30, heavy late in the session):** tests, `pickVideo`, the cleanup fix and the pending ref all went "do it for me". Explain what was written with a trace; keep the next step small enough to be theirs.
- **Sharp questions are a strength:** "shouldn't it guard anyway?", "isn't the test dependent on the getter?", "is it because the backend re-sends?". Answer with a table, and concede when they're right.
- **A warning in the same message gets missed** (s. 29 twice, s. 30 cleanup): make the trap its own step, or a question they must answer.
- **Visual work:** give classes directly / write the component. They notice font mismatches.
- **Doesn't work:** compound or re-asked questions; abstract questions; predicting output; sending to docs to learn a step.
- **Don't record a decision until they say so.** **"Break it on purpose" only after Vitest steps.**

## Next step

**M9: Drag and resize.** M8 is done and deployed (paste a link, both tabs cue it, refresh/late join keeps it; copy link button). At the start of M9, settle: pointer events + `setPointerCapture` vs mouse events (the iframe swallows moves); where the box's position/size lives (state in `SelfView` vs `RoomPage`) and whether it's pixels or % of the player; whether to keep the box clear of YouTube's control bar. Good spot to recheck "now vs later": a `pointermove` handler reading a ref, with them labelling each line first.
