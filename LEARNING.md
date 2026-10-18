# Learning Snapshot

_Last updated: 2026-10-18 (session 32)_

## Concepts

### Shaky
- **WebRTC (new, s. 32):** offer/answer, `setLocalDescription` ("what I said") vs `setRemoteDescription` ("what they said"), ICE candidates, `connectionState`. A bare API shape table + "write pseudocode for 3 things" left them "really lost" **twice**. What landed: a numbered story table (A / B / what travels / *where in your code*), then a fill-in-the-blank skeleton. Got the ordering right once laid out; asked sharp "what if" questions (candidate before the phone exists, the two nulls). Asked Claude to write each step.
- **Per-tab vs whole-system view (s. 32):** thought `useSync` syncs "between 2 sockets" (each tab has one), and that A's ref held B's phone. A diagram of two tabs, each with its own copy of the code, fixed both. Next time: draw both tabs before any multi-tab logic.
- **Check-then-act races (s. 32):** "the mutex protects it" — true per function, not across two calls. Ticket-booth analogy + "was someone here *before* me vs *now*" table got it; then designed `joinRoom`/`leaveRoom` to return the partner in one locked visit. Told (not derived): no network I/O while holding a lock.
- **Go (the language):** relearning. Used once each: `func`, `for` forms, `:=` vs `=`, maps + comma ok, closures, typed constants, `map[K]bool` sets, struct types, `regexp.MustCompile`, table tests, `json` + struct tags. S. 32 (written by Claude): multiple returns, `omitempty`, `defer func(){…}()`.
- **Units / coordinate spaces (s. 31):** mixed height- and width-fractions. Next time: ask "which unit is each value in?" first.
- **`context.Context`:** "a stop button the caller holds". Forgot a timeout once (s. 30).
- **Effect cleanup / "which code runs later":** s. 29–30 slips. S. 32 `subscribe` returns its own cleanup (written by Claude); still worth a recheck.
- **Two kinds of "ready" (s. 30)**, **TS types vanish at runtime (s. 21)**: not explained back.

### Learning (introduced, used or explained back once)
- **Pub/sub (s. 32):** "power strip" analogy: `useRoomSocket` is the strip, hooks plug in with `subscribe`, cleanup unplugs. Chose it after finding the chicken-and-egg problem in "socket in RoomView, pass a handler" themselves (lint confirmed).
- **Message order on one socket (s. 32):** one belt per tab, handled one at a time; server sends `partner-joined` before `partner-present`.
- **Debugging WebRTC (s. 32):** ruled out each link with evidence; learned `webrtc-internals` only records while open; found macOS Local Network permission off (mDNS `.local` candidates). Error 701 = an IPv6 STUN lookup, harmless.
- **Single responsibility:** applied it to the file split unprompted (s. 32).
- **`useRef` vs `useState`**, **pointer events**, **start + change**, **clamping**, **event bubbling** (s. 31).
- **Defensive guards**, **round-trip tests**, **`test.each`**, **Go `testing`**, **debugging a race** (s. 30).
- **M2–M7 detail in `docs/learning-archive.md`.**

### Solid
- **Product / design reasoning:** s. 32 pushed back on the IP-exposure risk and asked how Discord/Zoom/Meet do it before choosing; named the room code as the real gate. Set synced drags as the long-term goal.
- **Edge-case analysis + triage.** **Unit tests with Vitest.** **Callbacks.** **Debugging by isolation.** **Manual test plans.**
- **Errors as return values**; log-and-continue when the error is someone else's.
- **Deploying by hand:** commit → push → `fly deploy --ha=false` → `fly status`.
- **Git:** four areas, Conventional Commits, one logical change per commit, selective staging.

## Decisions

- **Frontend:** React + TS + Vite; Tailwind v4 + shadcn/ui; Bun; ESLint; Prettier; no React Compiler; keep StrictMode. JSDoc on declarations, `//` only inside bodies.
- **Backend:** Go, flat layout; `coder/websocket`; map helpers lock + `defer Unlock()`; `go vet` before committing Go. Room helpers that need "who else is here" answer it inside their own lock (`joinRoom`, `leaveRoom` return the partner).
- **Repo:** monorepo, Conventional Commits, straight to `main`. Docs + commit messages are Claude's.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8, TS 6. Ports 5173 / 8080.
- **Raw YouTube IFrame API**; sync rules in `src/sync.ts`, tested.
- **Hosting:** Fly.io, one machine, `--ha=false`; rooms in memory.
- **Workflow (s. 31):** pseudocode first, then a syntax sheet, they type. S. 32: they designed every step's logic but asked Claude to write all of it ("write it for me" is allowed after pseudocode).
- **Styling is delegated** to Claude.
- **Socket plumbing (s. 32):** `RoomView` owns `useRoomSocket`; `useSync` and `useCall` get the socket and `subscribe`. Why: the call needs the socket too, and passing a handler in creates a declare-before-use loop.
- **M10 call design (s. 32):** signalling over the room socket, newcomer offers, STUN then Cloudflare TURN, slots up front + `replaceTrack`, camera-off message, per-screen cams (synced drags later). Details in `ROADMAP.md`.
- **The app is public:** many couples' rooms.
- **Deferred to "Later":** ICE restart, hide-my-IP toggle, room-code hardening (s. 32); cam off-screen after a height-only resize, room expiry, bfcache ghost seat, auto-retry, shared close codes, CI/CD, font preload.

## Open questions

- Worldwide users: room routing (`fly-replay`) vs shared state. Post-MVP.
- After M10: synced drags (seats, clashing drags, different screen shapes).

## Teaching formats

- Works: **comparison tables**, **traces with state per row**, **ASCII diagrams** (two-tab diagrams especially), **concrete analogies** (s. 32: letters + phones, ticket booth, power strip, one belt per socket).
- Works: **options table + recommendation**; they push back with good reasons ("how do Discord/Zoom do it?"). Concede when they're right.
- **New domain (s. 32): story first, then API.** A numbered timeline (who does what, what travels, where in your code) → fill-in-the-blank pseudocode. A shape table alone, or "pseudocode for these N things", is too little to start from.
- **Ask "what does X actually hold?" style questions back:** they won't answer a question built on a model they don't have yet ("I can't answer until I know this"). Explain the model first.
- **Hint ladder rung 2 that landed (s. 31):** point at their own line and ask for the mirror version (s. 32: join loop before add ↔ leave loop after delete).
- **Don't re-ask for an explanation they just gave.**
- **Fast pace:** one step per turn, why → exact commands → "it worked if…". Verify with `git log`, lint, build, tests.
- **Sharp questions are a strength.** **A warning in the same message gets missed:** make the trap its own question.
- **Doesn't work:** compound or abstract questions; predicting output; sending to docs to learn a step.
- **Don't record a decision until they say so.** **"Break it on purpose" only after Vitest steps.**

## Next step

**M10 step 5: real media in the slots.** The call connects (offer/answer + candidates in `src/hooks/useCall.ts`). Next: put the camera and mic in the sending slots (`replaceTrack`; mic needs its own `getUserMedia` audio), show the partner's video and audio from `ontrack`, partner cam top-right. Then: mic toggle, camera-off message, headphones note, Cloudflare TURN, deploy.
