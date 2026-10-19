# Learning Snapshot

_Last updated: 2026-10-19 (session 36)_

## Concepts

### Shaky
- **WebRTC (s. 32–34):** offer/answer, ICE, slots (`addTransceiver`), `replaceTrack`, `ontrack`. S. 34: wanted to drop the video track from the partner stream on "camera off"; a two-row trace showed `ontrack` fires once per slot, so the track never comes back. Fill-in blanks that look like API slots still go wrong; keep them "in words", 2–3 per turn.
- **Work it out vs store it (s. 34, new):** got "camera on = `videoTrack !== null`" right, then proposed a ref that buffers the camera state for late joiners, and a new toggle for `showHandle`. A table showing the ref always equals the live value didn't land ("idk"). Next time: ask "who else could change this value?" before they pick state/ref.
- **Stale closures + updater form (s. 33–34):** s. 34 over-applied it (wanted `prev =>` because "window resize changes the width"). Told: the box is in fractions, so a resize changes nothing, and handlers are rebuilt every render. Rule given: you need the updater form when an old function reads state that something else changed since.
- **Client vs server (s. 32, s. 34):** thought the Go server would notice `cameraOn` changing; it's a relay that never reads it. Draw both tabs + server before multi-tab logic.
- **`useState` vs `useRef` (s. 33):** rule given: does the screen change when it changes? S. 34: explained the drag refs correctly ("each wrapper handles its own drag").
- **Effect cleanup (s. 29–33):** improving; wrote `useEffect(() => closePhone, [])` unprompted.
- **Check-then-act races (s. 32):** ticket-booth analogy landed.
- **Go (the language):** relearning. Used once each: `func`, `for`, `:=`/`=`, maps + comma ok, closures, typed constants, sets, structs, `regexp`, table tests, `json` tags.
- **Units / coordinate spaces (s. 31):** ask "which unit is each value in?" first.
- **`context.Context`**, **two kinds of "ready"**, **TS types vanish at runtime:** not explained back.
- **Env vars + secrets (s. 36, new):** knew `.env` in dev and Fly secrets in prod. Gaps: thought an env var is secret by itself (it's a named string the process is started with; safety = not in git, not in the frontend), and that Go "searches `.env`" in dev vs Fly secrets in prod, so wanted an `if dev / else prod` branch. Told: `os.Getenv` reads the process env the same way everywhere; only *who sets it* differs; missing = `""`, not null. Diagram (`.env`/Fly → environment → `os.Getenv`) given. Open question left: crash at startup vs warn + no TURN when the token is `""` (A/B table shown, unanswered).

### Learning (introduced, used or explained back once)
- **Controlled components (s. 34):** picked a controlled wrapper over a hook. Their reason was half right; told "hooks share logic; components share logic *and* markup".
- **Passing a setter down as a callback prop (s. 34):** got there from a pointer at `VideoPicker onPick`. Named `onBoxChange`, not `setX`, so it can later also send over the socket.
- **Local vs remote UI state (s. 34):** after one swap of terms, explained that hide cams sends nothing and touches no tracks.
- **Null cases of a value (s. 33–34):** picked `false` as the default for `partnerCameraOn` by comparing the two wrong-for-a-moment rows.
- **Pub/sub (s. 32)**, **message order on one socket**, **debugging WebRTC**, **single responsibility**, **`git commit --amend`**.
- **`useRef` for drags**, **pointer events**, **start + change**, **clamping**, **event bubbling** (s. 31).
- **Defensive guards**, **round-trip tests**, **`test.each`**, **Go `testing`**, **debugging a race** (s. 30). M2–M7 detail in `docs/learning-archive.md`.

### Solid
- **Product / design reasoning:** s. 34 proposed "hide cams" (local) separately from camera off (remote), and asked whether to hide the partner cam instead of a placeholder; weighed it against Zoom/Discord.
- **Edge-case analysis + triage.** **Unit tests with Vitest.** **Callbacks.** **Debugging by isolation.** **Manual test plans.**
- **Errors as return values**; log-and-continue when the error is someone else's.
- **Deploying by hand:** commit → push → `fly deploy --ha=false` → `fly status`.
- **Git:** four areas, Conventional Commits, one logical change per commit, selective staging.

## Decisions

- **Frontend:** React + TS + Vite; Tailwind v4 + shadcn/ui; Bun; ESLint; Prettier; no React Compiler; keep StrictMode. JSDoc on declarations, `//` only inside bodies.
- **Backend:** Go, flat layout; `coder/websocket`; map helpers lock + `defer Unlock()`; `go vet` before committing Go. The server relays every message unread.
- **Repo:** monorepo, Conventional Commits, straight to `main`. Docs + commit messages are Claude's.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8, TS 6. Ports 5173 / 8080.
- **Raw YouTube IFrame API**; sync rules in `src/sync.ts`, tested.
- **Hosting:** Fly.io, one machine, `--ha=false`; rooms in memory.
- **Workflow (s. 31):** pseudocode first, then a syntax sheet, they type. S. 32–34: they design the logic and often ask Claude to write it.
- **Styling is delegated** to Claude.
- **Socket plumbing (s. 32):** `RoomView` owns `useRoomSocket`; `useSync` and `useCall` plug in with `subscribe`.
- **M10 call (s. 32–36):** signalling over the room socket, slots up front + `replaceTrack`, separate `useMic`, `DraggableCam` controlled wrapper, `camera` + `mic` messages from `useCall`, "camera off" placeholder kept, local hide-cams toggle, muted badges, our own fullscreen (player + cams), control strip under the player. Details in `ROADMAP.md`.
- **Echo (s. 36):** tested on two devices; faint movie leak, masked in normal use. The headphones note is enough for the MVP.
- **The app is public:** many couples' rooms.
- **Deferred to "Later":** ICE restart, hide-my-IP toggle, room-code hardening; cam off-screen after a height-only resize, room expiry, bfcache ghost seat, auto-retry, shared close codes, CI/CD, font preload; z-order of overlapping cams; "Starting mic…" label; shared `getUserMedia` helper.

## Open questions

- Worldwide users: room routing (`fly-replay`) vs shared state. Post-MVP.
- After M10: synced drags (seats, clashing drags, different screen shapes).

## Teaching formats

- Works: **comparison tables**, **traces with state per row**, **ASCII diagrams** (s. 34: two-tab story with the late-joiner trap), **concrete analogies**.
- Works: **options table + recommendation**; they pick quickly and give a reason (s. 34: C for the wrapper, keep the placeholder).
- **New domain: story first, then API.** Blanks must read as "say it in words".
- **"I'm confused" → restart from the model** with a picture and a table, then one narrow question (s. 34: the default-value table fixed blank 3).
- **Hint ladder rung 2 that landed:** point at their own code (s. 34: `VideoPicker onPick` for the callback prop).
- **Time pressure (s. 34–36):** s. 34 said "do it for me" on 4 steps; s. 35–36 were "Claude writes, I review" (s. 36: UI touch-ups late in the day, "don't ask me any questions"). Design blanks still worth asking; offer "write it" sooner when time is short. UI polish fits the styling fast lane anyway.
- **Fast pace:** one step per turn, why → exact commands → "it worked if…".
- **Doesn't work:** compound or abstract questions; predicting output; docs to learn a step; many API-level blanks at once.
- **Don't record a decision until they say so.** **"Break it on purpose" only after Vitest steps.**

## Next step

**Back to the normal workflow** (user designs the logic, Claude gives a syntax sheet) unless they say otherwise.

**M10: Cloudflare TURN, then deploy + live test → M10 done.** Env vars already covered (s. 36). Resume at the open A/B question: token missing (`""`) → crash at startup, or warn and serve no TURN? Then show the shape of Cloudflare's credentials API and of `RTCPeerConnection`'s `iceServers`; they design the Go endpoint and the frontend side. New: `.gitignore` has no `.env` yet; `fly secrets set`.

**MVP left (~3–4 sessions):** M10 (~1) + M11 Devices (~2–3). Offered: move M11 to "Later" and use the app after M10. Undecided.
