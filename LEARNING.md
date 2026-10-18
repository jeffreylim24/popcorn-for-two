# Learning Snapshot

_Last updated: 2026-10-18 (session 31)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch. Used once each in real code:
  - S. 7–11: `func`, `for` forms, `:=` vs `var`/`=`, `const`, zero values, maps + comma ok, `_`, route wildcards + `r.PathValue`, `for {}` read loop, closures, typed constants, set idiom `map[K]bool`, `for k := range m`.
  - S. 21–24: returning an `http.Handler`; one package across files; `foo_test.go`.
  - S. 30: struct type + `map[string]*room` (a map hands back a copy); `regexp.MustCompile` at package level; table tests; `json.Unmarshal` / `json.Marshal` with struct tags. Written from pseudocode; told, not explained back.
- **Units / coordinate spaces (new, s. 31):** mixed fractions of the window's *height* with fractions of its *width* twice (`y + width·9/16 ≤ 1`; then `min(1, rx + x)`, px plus a fraction). A px trace showing the formula "passes" while the cam is off-screen, then "write the x version of your own `ry` line" (rung 2), got it. Next time: ask "which unit is each value in?" before the formula.
- **`context.Context`:** "a stop button the caller holds; the function only watches it". S. 30: forgot the timeout on a new `conn.Write` until reminded.
- **Effect cleanup / "which code runs later":** s. 29 four slips, s. 30 one. Not exercised in s. 31 (no effects). The deferred resize-listener fix (`ROADMAP.md` Later) is a good recheck.
- **Two kinds of "ready" (s. 30):** restaurant analogy ("restaurant open" = script loaded vs "your table" = `onReady`). Not checked back.
- **TS types vanish at runtime:** wrote `typeof v.type !== SyncMessage['type']` (s. 21). Not explained back.
- **HTTP:** once mixed up the page URL (`/room/CODE`) with the API URL.

### Learning (introduced, used or explained back once)
- **`useRef` vs `useState` (improving fast):** s. 31 answered "state or ref?" unaided with the rule: "the values don't appear on screen, we just need to remember them between events". Used a ref as the "dragging?" flag (`null` = not dragging).
- **Pointer events (s. 31):** `pointerdown/move/up`, `setPointerCapture` (moves keep coming over the iframe), `clientX/Y`, `getBoundingClientRect`. Designed drag + resize from a shape table.
- **Start + change, not current + change (s. 31):** first pseudocode would compound; a 3-row trace fixed it at once. Annoyed when asked to explain it back: they had just reasoned it out.
- **Clamping (s. 31):** chose "clamp to the limit" over "skip the update" after a trace; clamp per axis.
- **Event bubbling + `stopPropagation` (s. 31):** told once, used right in the resize pseudocode.
- **Event listeners:** remembered "turn the listener on/off"; told React's `onX` props stay attached, so a guard does the same. Chose the guard.
- **Defensive guards (s. 30):** "each function shouldn't depend on how others call it".
- **Round-trip tests**, **`test.each`**, **Go `testing`** (`t.Fatalf` vs `t.Errorf`, table tests).
- **Debugging a race (s. 30):** hypothesis → DevTools WS messages → "is not a function" vs "of null".
- **Hooks in a child that mounts later**, **`async`/`await` in an effect**, **safe refactor loop**, **function identity / `useEffectEvent` / `useCallback`** (recheck open), **custom hooks**, **`setInterval`**, **echo guard**, **sync design ("ahead wins")**, **JSON**, **TS literal unions**, **StrictMode double-mount**, **`WebSocket` + `readyState`**.
- **M2–M7 detail in `docs/learning-archive.md`.**

### Solid
- **Product / design reasoning:** s. 31 rejected "clamp to the player" ("why force ourselves to cover the video?") and "facecam over YouTube's controls is fine: a click on the box is always for the box". Proposed a seat-based "shared stage" (deferred to M10). Earlier: collision risk, server as source of truth, the 2-person cap, single responsibility.
- **Edge-case analysis + triage:** found why a height-only resize pushes the cam off-screen, judged it very low, filed a GitHub issue.
- **Unit tests with Vitest.** **Callbacks, calling vs handing over.** **Debugging by isolation.** **Manual test plans.**
- **Errors as return values**; log-and-continue when the error is someone else's.
- **Deploying by hand:** commit → push → `fly deploy --ha=false` → `fly status`.
- **Git:** four areas, upstream, Conventional Commits, one logical change per commit, selective staging (`git add -p` split docs from feat in s. 31).

## Decisions

- **Frontend:** React + TS + Vite; Tailwind v4 + shadcn/ui; Bun; ESLint; Prettier (single quotes, no semicolons); no React Compiler; keep StrictMode. **JSDoc (`/** */`) on declarations** so hover shows it; `//` only for steps inside a body (their call, s. 31).
- **Backend:** Go, flat layout; `coder/websocket`; map helpers lock + `defer Unlock()`, and guard a missing room. `go vet ./...` before committing Go.
- **Repo:** monorepo, Conventional Commits, straight to `main`. Docs + commit messages are Claude's; the user stages, commits, pushes.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8, TS 6. Ports 5173 / 8080; Vite proxies `/api` (`ws: true`).
- **Raw YouTube IFrame API**, YouTube's own controls. Sync rules in `src/sync.ts`, tested.
- **Hosting:** Fly.io, one machine in `yyz`, `--ha=false`. Rooms in memory: a deploy or restart wipes them.
- **Workflow (s. 31, their call):** pseudocode first; once it's right, Claude gives a syntax sheet (generic examples + the exact docs bit), they type it, Claude reviews. Searching docs was the slowdown, not the typing. See `CLAUDE.md`.
- **Styling is delegated:** Claude writes visual work (cream / cocoa / terracotta, Pixelify Sans headings, lucide icons). App logic stays theirs.
- **M5–M8:** see `ROADMAP.md`.
- **M9 (s. 31):** pointer capture; `camBox` fractions of the window in `RoomView`; bounded by the window, not the player; covering YouTube's controls is OK; bottom-right resize, min 0.1. Details in `ROADMAP.md`.
- **The app is public:** many couples' rooms; weigh SEO, abuse, scaling.
- **Deferred to "Later":** cam off-screen after a height-only resize (GitHub issue), room expiry, bfcache ghost seat (`pagehide`), auto-retry with backoff, shared close-code constants, CI/CD, code-quality pass, Pixelify Sans preload. `useHealth.ts` unused (their call).

## Open questions

- Worldwide users: room-based routing (`fly-replay`) vs shared state. Post-MVP.
- M10: "shared stage" start (seat 1 top-left, seat 2 top-right on both screens): do drags then sync, or stay per screen? Needs the server to send each tab its seat.

## Teaching formats

- Works: **comparison tables**, **traces with state after each line** (s. 31: every logic gap was closed by a 3-row trace), **ASCII flow diagrams**, **concrete analogies** when mechanism explanations don't land. Ask "what do you remember?" first.
- Works: **options table + recommendation** for design questions; they push back with good reasons. Concede when they're right.
- **Unfamiliar API → show its shape first** (a table of real outputs).
- **Hint ladder rung 2 that landed (s. 31):** point at their *own* earlier line and ask for the mirror version.
- **Don't re-ask for an explanation they just gave** in the same conversation ("I literally answered this"). Check understanding on the parts they *didn't* reason out.
- **Fast pace:** one step per turn, why → exact commands → "it worked if…". On "done", verify with `git log`, lint, build, tests.
- **Pseudocode-first (s. 31):** pseudocode came quickly and was mostly right; gaps were units and missing cases, not syntax. They read the code (edited comments themselves). From s. 32: watch whether the syntax sheet is enough to type from, or still sends them to docs.
- **Sharp questions are a strength.** **A warning in the same message gets missed:** make the trap its own question.
- **Visual work:** give classes directly / write the component.
- **Doesn't work:** compound or re-asked questions; abstract questions; predicting output; sending to docs to learn a step.
- **Don't record a decision until they say so.** **"Break it on purpose" only after Vitest steps.**

## Next step

**M10: Call.** M9 is done and passed on the live site (drag, clamp to the window, bottom-right resize). The hover-only handle (`b5e86ed`) goes live with the next deploy. At the start of M10, settle: WebRTC signalling over the existing room socket, STUN/TURN, how the partner's cam is placed (the shared-stage question above), and adding the mic.
