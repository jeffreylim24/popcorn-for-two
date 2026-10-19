# Learning Snapshot

_Last updated: 2026-10-18 (session 33)_

## Concepts

### Shaky
- **WebRTC (s. 32–33):** offer/answer, ICE, slots (`addTransceiver`), `replaceTrack`, `ontrack`. S. 33: picked both design options with good reasons from a story table + options table. Fill-in blanks went wrong when they looked like API slots (answered `slot.sender`, `camStream` where plain-words steps were meant), and after a second hint round they said "idk, do it for me". Claude wrote 5c and 5d. Next time: label blanks "in words" and keep it to 2–3 blanks per turn.
- **`useState` vs `useRef` (s. 33):** chose a ref for the partner stream ("avoid rerenders"; Google says refs for streams). The rule given: does the screen change when it changes? Also: those articles mean a ref to the `<video>` element. Not explained back yet.
- **Stale closures + updater form (s. 33, new):** `ontrack` was created when the state was null, so `setX(prev => …)` is needed. Taught with a two-event table, written by Claude. Contrast: a ref read at call time is never stale (the `closePhone` cleanup).
- **Effect cleanup (s. 29–33):** improving. S. 33: thought the `cancelled` stop in `useMic` was "mute"; a StrictMode trace (orphan stream) fixed it. Picked the separate `[]` effect for hang-up by tracing the "subscribe changes" case, then wrote `useEffect(() => closePhone, [])` unprompted. Also learned that each effect reruns only its own code.
- **Per-tab vs whole-system view (s. 32):** a two-tab diagram fixed it. Draw both tabs before multi-tab logic.
- **Check-then-act races (s. 32):** ticket-booth analogy landed. No network I/O while holding a lock (told, not derived).
- **Go (the language):** relearning. Used once each: `func`, `for`, `:=`/`=`, maps + comma ok, closures, typed constants, sets, structs, `regexp`, table tests, `json` tags; seen: multiple returns, `omitempty`, `defer func(){…}()`.
- **Units / coordinate spaces (s. 31):** ask "which unit is each value in?" first.
- **`context.Context`:** "a stop button the caller holds". Forgot a timeout once (s. 30).
- **Two kinds of "ready" (s. 30)**, **TS types vanish at runtime (s. 21)**: not explained back.

### Learning (introduced, used or explained back once)
- **Null cases of a value (s. 33):** listed denied/not found; found "still waiting" and "toggled off" from a pointer at their own code.
- **`git commit --amend` (s. 33):** only for unpushed commits.
- **Pub/sub (s. 32):** "power strip": hooks plug in with `subscribe`, cleanup unplugs.
- **Message order on one socket (s. 32)**, **debugging WebRTC** (webrtc-internals records only while open; macOS Local Network permission).
- **Single responsibility:** applied unprompted (s. 32, s. 33 hang-up effect).
- **`useRef` for drags**, **pointer events**, **start + change**, **clamping**, **event bubbling** (s. 31).
- **Defensive guards**, **round-trip tests**, **`test.each`**, **Go `testing`**, **debugging a race** (s. 30).
- **M2–M7 detail in `docs/learning-archive.md`.**

### Solid
- **Product / design reasoning:** pushes back with real-world checks (Discord/Zoom). S. 33: spotted that the lobby needs the mic toggle and that errors must split (`camError`/`micError`).
- **Edge-case analysis + triage.** **Unit tests with Vitest.** **Callbacks.** **Debugging by isolation.** **Manual test plans.**
- **Errors as return values**; log-and-continue when the error is someone else's.
- **Deploying by hand:** commit → push → `fly deploy --ha=false` → `fly status`.
- **Git:** four areas, Conventional Commits, one logical change per commit, selective staging.

## Decisions

- **Frontend:** React + TS + Vite; Tailwind v4 + shadcn/ui; Bun; ESLint; Prettier; no React Compiler; keep StrictMode. JSDoc on declarations, `//` only inside bodies.
- **Backend:** Go, flat layout; `coder/websocket`; map helpers lock + `defer Unlock()`; `go vet` before committing Go. Room helpers answer "who else is here" inside their own lock.
- **Repo:** monorepo, Conventional Commits, straight to `main`. Docs + commit messages are Claude's.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8, TS 6. Ports 5173 / 8080.
- **Raw YouTube IFrame API**; sync rules in `src/sync.ts`, tested.
- **Hosting:** Fly.io, one machine, `--ha=false`; rooms in memory.
- **Workflow (s. 31):** pseudocode first, then a syntax sheet, they type. S. 32–33: they design the logic and often ask Claude to write it.
- **Styling is delegated** to Claude.
- **Socket plumbing (s. 32):** `RoomView` owns `useRoomSocket`; `useSync` and `useCall` plug in with `subscribe`.
- **M10 call (s. 32–33):** signalling over the room socket, newcomer offers, STUN then Cloudflare TURN, slots up front + `replaceTrack`. S. 33: separate `useMic` (mute only, no `enabled`), tracks into `useCall`, partner stream in state, partner cam unmirrored (tried mirrored, reverted), hang up in its own `[]` effect. Details in `ROADMAP.md`.
- **The app is public:** many couples' rooms.
- **Deferred to "Later":** ICE restart, hide-my-IP toggle, room-code hardening; cam off-screen after a height-only resize, room expiry, bfcache ghost seat, auto-retry, shared close codes, CI/CD, font preload.

## Open questions

- Worldwide users: room routing (`fly-replay`) vs shared state. Post-MVP.
- After M10: synced drags (seats, clashing drags, different screen shapes).

## Teaching formats

- Works: **comparison tables**, **traces with state per row** (s. 33: StrictMode orphan stream, the two `ontrack` events, ref-vs-state screen trace), **ASCII diagrams**, **concrete analogies** (s. 33: phone still on the call after leaving the room).
- Works: **options table + recommendation**; they pick quickly and give a reason. Concede when they're right (s. 33: lobby mic toggle).
- **New domain: story first, then API.** Numbered timeline (who / what travels / where in your code) → blanks. Blanks must read as "say it in words", or they get filled with API names.
- **"I'm confused" → restart from the model** with a picture and a "when does it happen" table, then re-ask one narrow question. Worked twice in s. 33.
- **Be honest when overstating:** s. 33 the "leak" turned out to be future-only; saying so and offering "now or later" went fine.
- **Ask "what does X actually hold?" questions** only after the model is explained.
- **Hint ladder rung 2 that landed:** point at their own code (s. 33: "what is `stream` while the prompt is up?").
- **Fast pace:** one step per turn, why → exact commands → "it worked if…".
- **Sharp questions are a strength.** **Make a trap its own question.**
- **Doesn't work:** compound or abstract questions; predicting output; docs to learn a step; many API-level blanks at once.
- **Don't record a decision until they say so.** **"Break it on purpose" only after Vitest steps.**

## Next step

**M10: partner cam draggable + resizable.** Media flows both ways (`useMic`, `putTracks`, `ontrack` → `PartnerView` fixed top-right). The drag/resize code in `RoomView` is wired to one box, so first decide how to reuse it for two (a hook? a component?). Then: mic toggle (lobby + room), camera-off message, headphones note, Cloudflare TURN, deploy.
