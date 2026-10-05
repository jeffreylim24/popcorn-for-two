# Learning Snapshot

_Last updated: 2026-10-04 (session 6)_

## Concepts

### Shaky
- **Go (the language):** treat as new. Built a Go app before, but AI wrote most of it, so little stuck.

### Introduced (planning only, no code yet)
- **Signaling (WebRTC):** browsers can't accept incoming connections, so a server both can reach relays setup info; then video flows browser-to-browser. Got there with a client/server diagram + phone-number analogy.
- **WebSocket vs fetch:** server can push any time; fetch only answers when asked. Not yet explained back.
- **YouTube IFrame Player:** each browser streams from YouTube; Go only relays small messages like `{"type":"pause","time":42.3}`.

### Learning (introduced, used or explained back once)
- **`useRef`:** started from nothing. A box that survives re-renders; changing `.current` doesn't re-render; for things code holds (players, timers, sockets), not things shown. Unrelated timer example + `useState` comparison table landed. Gaps hit: first wrote `playerRef = player` (assign `.current`, not the box), then put the assignment *after* the function instead of inside it (defining a function doesn't run it). Then proposed dropping the local `player` variable on their own and did the refactor cleanly.
- **Effect cleanup:** now `playerRef.current?.destroy()` then `= null`, so nothing calls a dead player. Earlier version used a shared `let player`; replaced by the ref.
- **`undefined` vs `null`:** "never set" vs "deliberately empty"; `?.` stops on both; a `let` with `| null` needs `= null` written out. Chose `null` and used it consistently.
- **Reading a TS method signature:** `seekTo(seconds: number, allowSeekAhead: boolean): void`; no `?` = required. Used it correctly.
- **YouTube player state vs position:** observed that `seekTo` keeps play/pause state. Groundwork for M3.
- **`<script>` tags:** the browser downloads + runs the file; plain scripts run on arrival, `type="module"` is deferred. A script can inject another script (`iframe_api` → `www-widgetapi.js`).
- **Race between React and a loading script:** `if (YT.Player)` create now, else hand over the callback. Explained the `if` branch back; needed the `else` branch explained.
- **TS types for globals:** `@types/*` = community-written descriptions, no runtime code. `tsconfig` `"types"` is an allow-list. `declare global { interface Window {...} }` merges a missing property. Read it back as "creates an interface"; corrected to "adds to the existing one".
- **dependencies vs devDependencies:** browser code vs dev-only tools (`bun add -d`). Thought `package.json` and `bun.lock` were "the same": the first holds the range you asked for, the second the exact pinned version.
- **Commit message content:** chose `chore` for a user-facing feature and put the *how* in the subject. Couldn't write the body's *why*. Claude now drafts messages (see Decisions).
- **`package main` / `func main()`**, **`net/http` basics** (handler `(w, r)`, method+path patterns, `log.Fatal(ListenAndServe)`).
- **CORS / same-origin policy:** origin = scheme + host + port. Browser-only.
- **Vite dev proxy:** forwards `/api` to Go; relative URLs resolve against the page's origin.
- **HTTP status line:** 200 / 404 / 502; ask "which hop added this header?"; use `response.status`.
- **`useState`** (value + setter, setter re-renders) and **`useEffect`** (after render, `[]` = mount, cleanup).
- **Promise chains + fetch errors:** each `.then` gets the previous return; HTTP errors resolve, so check `response.ok` and `throw`.
- **StrictMode double mount:** dev-only mount → unmount → mount to expose missing cleanup.
- **Message contract:** both sides must agree on the shape; mismatches fail silently.

### Solid
- **Callbacks, calling vs handing over:** explained back unprompted why `onClick={ref.current?.playVideo()}` is wrong (calls now, passes `void` where a function is expected).
- **Debugging by isolation:** narrowed "video doesn't change on save" step by step (hot reload? effect rerun? Console hiding logs?). Good method under frustration.
- Checking a commit before pushing: `git show --stat HEAD` (the user says it's a habit now)
- Git's four areas, `git status -sb` (`[ahead N]`), checking a push (`git fetch`, upstream tracking)
- Commit format: imperative, ~50-char subject, blank line, body for the *why*; Conventional Commits (`chore` setup, `feat` user-facing)
- One logical change per commit; selective staging
- `.gitignore` scope; `bun.lock` committed; `go.mod` / `go.sum`; toolchains vs project deps

## Decisions

- **Frontend:** React + TS + Vite (Next.js would overlap with Go); shadcn/ui + Tailwind (own the component source); Bun; ESLint; no React Compiler (see re-renders).
- **Backend:** Go (good at many concurrent connections), flat layout until there are several programs.
- **Repo:** monorepo `frontend/` + `backend/` (one commit can change both sides of a message contract). Conventional Commits. Commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. **Ports:** Vite 5173, Go 8080. Vite dev proxy for `/api` (one origin, no CORS code).
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand after M3; CI/CD later.
- **Docs files are Claude's** (`ROADMAP.md`, `LEARNING.md`, `CLAUDE.md`). LEARNING.md is a snapshot, committed by Claude at wrap-up.
- **Commit messages:** Claude drafts them (from session 5); the user stages, commits, and pushes.
- **Raw YouTube IFrame API, no React wrapper** (`react-youtube`, `react-player`): sync is imperative (`seekTo`, `getCurrentTime`, `onStateChange`), the echo loop needs full control over when events fire, and wrappers treat props as the source of truth when ours is WebSocket messages. Wrap it in our own hook later. Loaded by a static `<script>` in `index.html` because the app always needs the player.
- **Player lives in `playerRef`, no local variable:** buttons (and later the WebSocket handler) reach it from outside the effect. Using `ref.current` in cleanup is fine here: the hooks lint rule only warns for refs React fills (checked in `node_modules`).
- **Reload the page after editing code inside an effect.** Verified in session 5: with React 19.3 + plugin-react 6.1, a save re-renders but does *not* rerun effects (the docs claim otherwise).

## Open questions

- None here. Per-milestone design questions live in `ROADMAP.md`.

## Teaching formats

- Works: ASCII flow diagrams; comparison tables; reviewing the user's own drafts; concrete scenario questions.
- Works: small *unrelated* examples (block-form arrow, `throw`, WebSocket cleanup, timer-in-a-ref). The user maps them onto their code.
- Works: "explain it back" after running something; debugging by investigating, not guessing.
- Works: "try it in two situations and report" (seek while playing vs paused). Observation, not prediction.
- **Be precise about where code goes.** "Inside the effect" was vague; the user asked Claude to write that part. Name the function/line, or ask "which line runs when X exists?".
- **Tie a step to the end goal up front.** The user asked "why my own buttons?"; answer: they test "code controls the player", the same path M3's messages use.
- **Doesn't work: making the user investigate third-party internals** (minified code, Initiator tab, blocking requests). It felt like overload ("what's the point?"). State facts about tools directly; save investigation for the learning goals (state, sync, Go).
- **Doesn't work: too many unknowns in one step.** Give one new idea per step, with syntax examples up front. Session 6 followed this and went smoothly.
- **Claude: verify tool behavior before using it as a check.** A wrong claim (save reruns effects) caused a long debugging detour. Session 6: checked the lint rule source before answering; corrected own over-cautious advice (keep `let player`).
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- The user questions their tools and process; engage. When deciding, asks "what do you recommend?". Give a recommendation + trade-off table.
- Analogies: mixed. Phone-number (signaling) worked with a diagram; pickup counter (callback) didn't clearly land.

## Next step

**M1 done. Start M2: Rooms.** Begin with the design questions in `ROADMAP.md` (how two people end up in the same room; how the server notices a dead connection), not code. First Go WebSocket work; Go is shaky, so ask what they remember first.
