# Roadmap

MVP: two people on a video call watch a YouTube video in sync.

Approach: build each piece when the previous one makes me need it.
Every milestone ends in something I can demo and commit.

## Milestones

- [x] **M1: YouTube player (solo)**
  - Done when: my own Play / Pause / Jump buttons control an embedded
    YouTube video on the page.
  - Why next: it's the heart of the app, and it runs on one machine
    with no server.
  - Decided: raw IFrame API, no React wrapper (sync needs direct
    control of player calls and events); API loaded by a static
    `<script>` in `index.html`; player
    created when `YT.Player` exists, else via `onYouTubeIframeAPIReady`.
  - Decided: player held in a `useRef` so code outside the effect can
    call it (M3's message handler will too); cleanup destroys it, then
    empties the ref so nothing calls a dead player.

- [x] **M2: Rooms**
  - Done when: two browser tabs join the same room, and a message sent
    from one shows up in the other, relayed by the Go server.
  - Why next: after M1, pausing only affects my own screen. I need a
    way to get a message to my partner.
  - Decided: the server generates a random 6-character room code
    (`POST /api/rooms`), regenerating while the code is already taken;
    the server is the one place that knows every room.
  - Decided: max 2 people per room (a stranger who guesses a code gets
    "room full").
  - Decided: a "Copy link" button gives `…/room/CODE`; opening the link
    joins the room. Typing a code isn't needed.
  - Decided: dead connections are found by WebSocket ping/pong: ping
    every 15s, close and free the slot after 30s of silence. A clean
    tab close is noticed at once; the heartbeat covers silent deaths
    (battery, sleep, Wi-Fi drop).
  - Decided: WebSocket library is `coder/websocket` (actively
    maintained; writes are safe from any goroutine, which relaying
    needs; `Ping(ctx)` covers the heartbeat). Trade-off: fewer
    tutorials than gorilla/websocket.
  - Decided: unknown or full rooms are rejected *after* `Accept` with an
    app close code (4000–4999), so the frontend can read the reason
    (`statusRoomNotFound` = 4004, `statusRoomFull` = 4005). Rejecting
    before `Accept` hides the HTTP status from JS.
  - Decided: each room stores a set of its connections
    (`map[string]map[*websocket.Conn]bool`): count = full check,
    loop = relay, `delete` = leave.
  - Decided: `joinRoom` returns sentinel errors (`errRoomNotFound`,
    `errRoomFull`); the handler matches them with `errors.Is` and
    closes anything else with 1011.
  - Decided: `defer leaveRoom` goes after a successful join, so a
    rejected client never "leaves". Empty rooms are kept (a refresh
    before the partner joins must not kill the room); expiry is Later.
  - Done so far: `POST /api/rooms` creates a room. `GET
    /api/rooms/{code}/ws` joins under one lock, rejects unknown (4004)
    and full (4005) rooms, reads until the client leaves, then frees
    the slot. Vite's `/api` proxy has `ws: true`.
  - Decided: relay looks up the partner per message (`getPartnerConn`,
    under the lock) and writes outside the lock. Each `Write` gets a 5s
    timeout ctx from `r.Context()`, cancelled right after (not
    deferred: the loop outlives each message). A failed write is logged
    and the sender stays connected; messages sent while alone are
    dropped (M3 handles state for a late joiner).
  - Done: a message from one tab shows up in the other, not in the
    sender's own tab.

- [x] **M3: Sync**
  - Done when: play, pause, or seek in either tab, and the other tab's
    video follows within about a second, with no echo loop.
  - Why next: messages arrive after M2, but the player ignores them.
  - Known from M1: `seekTo` keeps the play/pause state (paused stays
    paused), except before the first play, when it starts the video.
  - Decided: message contract is `{ type: "action" | "sync", position,
    state }` (state = playing / paused). Every message carries the full
    state, so one message is enough to catch up. `play`/`pause`/`seek`
    are one `action` type: the receiver does the same thing for all of
    them, and `state` already says which.
  - Decided: no `sentAt` / latency compensation. Two machines' clocks
    can't be compared (skew gives negative or inflated delays), and
    travel time (~0.2 s) is well inside the 1 s target. A round-trip
    estimate wouldn't catch a one-off slow message anyway.
  - Decided: `action` always sets the state; `seekTo` only if the gap
    is over 1 s (avoids a visible twitch for tiny travel-time gaps).
  - Decided: while playing, each side sends a `sync` every 2 s. The
    receiver seeks only if the received position is **ahead** by more
    than 1 s. "Ahead wins" is the tie-break both sides agree on with
    no host; without it, crossed syncs swap positions forever. Worst
    case after a freeze: out of sync for up to one tick (2 s).
  - Decided: echo guard is "only send news". `lastStateRef` holds the
    last state the room agreed on (`{ state, position, at }`), written
    on every real send and every applied `action`. `sendAction` skips
    when the state matches and the position is within
    `SEEK_THRESHOLD_S` of the expected one (`position`, plus elapsed
    seconds since `at` while playing). Why: both echo paths
    (`onStateChange` and the paused-check timer) go through
    `sendAction`, so one check covers both. Nothing has to be
    "consumed", so no stale note can swallow a real action. Rejected:
    a consume-once note in `onStateChange` (misses the timer echo;
    goes stale on no-op calls), a quiet time window (guessed length,
    drops real clicks), and no guard (a late echo undoes a newer
    action).
  - Known limit: if buffering after a remote play takes over 1 s, the
    projection runs ahead and one echo still goes out. Harmless (the
    gap rule ends it); the `sync` tick covers drift.
  - Found: a seek while paused fires no `onStateChange` (state stays
    paused; buffering only happens on the next play). Seeking while
    playing fires buffering → playing, so it already sends.
  - Decided: keep YouTube's own controls. Familiar, and personal
    controls (subtitles, quality, volume, fullscreen) come free; speed
    is reported by `onPlaybackRateChange`. Custom controls would mostly
    be visual work. The page can't see clicks inside the cross-origin
    iframe, so paused seeks are detected by checking the position while
    paused. That also covers the dev-only Skip button (no send of its
    own).
  - Later: playback speed; send a `sync` right when buffering ends
    instead of waiting for the next tick.
  - Decided: the room code is segment 2 of `window.location.pathname`
    (`/room/CODE`); no code means no socket. The socket lives in
    `socketRef`, opened and closed by its own effect.
  - Decided: keep StrictMode. Its dev-only mount → cleanup → mount
    opens a second socket; a correct cleanup (close + `null`) is the
    fix, not turning StrictMode off.
  - Decided: messages are typed as `SyncMessage` (now in `sync.ts`).
    `onStateChange` reads the position from `e.target` (the event's
    own player) and the socket from `socketRef.current` at fire time.
  - Done so far: each tab connects on load; play/pause/seek in one tab
    sends an `action`, and the other tab applies it (seek first, then
    play/pause, because of the M1 `seekTo` quirk). Paused seeks are
    caught by a 500 ms position check while paused (`timerRef`;
    `stopTimer()` runs first on every state change and on unmount).
  - Done: echo guard. Verified in DevTools (Network → WS → Messages):
    the receiver sends nothing back for play, pause, a paused seek, or
    a playing seek.
  - Decided: `sync` and `lastStateRef`. Every send and every apply
    writes the note: a sent `sync` writes `{ 'playing', currentTime,
    now }`, and an applied `sync` (partner ahead by over 1 s) writes
    `{ 'playing', msg.position, now }`. An ignored `sync` (we're
    ahead) leaves it alone. Why: the apply's seek fires buffering →
    playing, which would otherwise go out as an `action`. Re-anchoring
    on each sent `sync` keeps the note's projection within one tick
    of the real video, so small buffer stalls can't add up past 1 s
    and trigger a stray `action`. Cost: one object write per tick.
    Each tab has its own note; it is not shared truth, and the two can
    briefly differ.
  - Decided: `sync` is sent by its own `sendSync`, not `sendAction`.
    The echo guard would drop nearly every `sync` (while playing, the
    projected position matches), and a `sync` is a routine report, not
    news.
  - Decided: a tab ignores incoming `sync`s unless it is playing
    (`getPlayerState() === PLAYING`). Why: a `sync` can cross a pause
    `action` on the wire. Applying it would make the paused video jump
    forward and the paused check would send a stray `action`. A `sync`
    only describes playback; only an `action` changes state.
  - Decided: `SYNC_INTERVAL_MS = 2000`, tune after watching real
    drift. The interval is the longest a drift goes unnoticed. Faster
    adds little: the 1 s threshold means drift must build up first,
    and more ticks mean more `sync`s crossing an in-flight `action`.
    Buffering (the main drift cause) gets its own `sync` later, so the
    tick is a safety net. Chrome caps hidden-tab timers at 1/s, and
    its 1/min throttling skips pages playing audio, so 2 s still holds
    in a background tab.
  - Done: `sync` tick. `sendSync` every `SYNC_INTERVAL_MS` while
    playing (reuses `timerRef`; `stopTimer()` ends it on any state
    change). Receiver applies only while playing and only if the
    partner is over 1 s ahead. Verified with tab B at 1.25x speed: A
    jumps forward every few seconds, and DevTools shows no `action`
    after a jump. M3's "done when" is met; the cleanup below is left.
  - Not designed yet: late-join catch-up. A tab that hasn't pressed
    play ignores `sync`s, so a late joiner waits for a click. Check
    Chrome's autoplay rules before designing it.
  - Found: Chrome's autoplay policy blocks `playVideo()` from a
    received `action` in a tab nobody has clicked yet; the message
    arrives but the video stays unstarted. One click anywhere on the
    page unblocks it (confirmed: reload, no click → stuck; one click on
    blank page → follows). Feeds the late-join design.
  - End of M3 cleanup (from the code review), in this order:
    1. Done: removed the Vite demo leftovers.
    2. Done: sync decisions are pure functions in `src/sync.ts`, with
       `SyncMessage`, `AgreedState`, and `SEEK_THRESHOLD_S`:
       `expectedPosition(last, nowMs)` (exhaustive `switch` with a
       `never` default), `isNews(last, state, position, nowMs)` (echo
       guard), `shouldCatchUp(isPlaying, myPosition, partnerPosition)`
       (applying a `sync`). Time comes in as `nowMs` and YouTube state
       as a boolean, so `sync.ts` never touches the clock or `YT` and
       tests need no fakes. Tested in `src/sync.test.ts` (17 tests).
    3. Done: split `App.tsx` into custom hooks, one file each in
       `src/hooks/`. Decided: 4 hooks. `useHealth`;
       `useRoomSocket(code, onMessage)` returns a stable `send`, knows
       nothing about YouTube (deals in strings only, `JSON.parse`
       stays with the caller; `onMessage` via `useEffectEvent`, `send`
       via `useCallback` reading `socketRef` at call time);
       `useYouTubePlayer(playerRef, elementId, videoId,
       {onLocalChange, onPlayingTick})` returns nothing, owns the
       timers, knows nothing about sockets;
       `useSync(code, elementId, videoId)` owns `playerRef`,
       `lastStateRef` and the `isNews`/`shouldCatchUp` policy, composes
       the other two, returns `playerRef` for App's dev buttons.
       Callbacks reach the once-only effects through `useEffectEvent`
       (React 19.2+). Rejected: 2 hooks passing refs to each other.
       Verified with the two-tab check after the split.
  - Decided: `useSync` creates `playerRef` and passes it into
    `useYouTubePlayer` (option A). Why: the socket handler needs the
    player and the player callbacks need `send`, so with the player
    hook returning its own ref, either call order used something
    before it was declared. Creating the ref above both calls means
    every line uses only things above it, lint-clean, and the two
    hooks never see each other. Cost: the player hook doesn't fully
    own its ref. Rejected: a late-bound "holder" ref filled after both
    calls (a ref write during render, which lint flags; easy to
    forget), one combined player + socket hook (undoes the split), and
    returning player controls referenced before their declaration
    (lint: "accessed before it is declared").
  - Decided: `useSync(code, elementId, videoId)`, not `useSync(code)`.
    Why: the page decides which element and video; sync logic doesn't
    care. When choosing a video arrives, only App changes.
  - Decided: Vitest for frontend tests (`bun run test` = `vitest run`).
    Reuses the Vite config, the standard runner for Vite projects, and
    fits later hook/component tests. Rejected: `bun test` (no install,
    but separate config and less common for React tests).
  - Before deploy (M4): wrap `JSON.parse` in `try/catch` and check the
    message shape (done). `WebSocket.send()` throws while the socket is still
    connecting (`sendAction` and `sendSync`); check `readyState` first.

- [x] **M4: First deploy (by hand)**
  - Done when: the app runs on a public HTTPS URL, and two devices on
    separate networks watch a video in sync. (Was "my partner and I";
    changed in session 25, since a VPN test covers HTTPS, real lag and
    two independent browsers. Routers only matter once WebRTC arrives.)
  - Why next: two tabs on one laptop hide real lag, HTTPS, and home
    routers. Also: first real date night.
  - Decided: Fly.io, one always-on machine in `yyz` (Toronto, between
    Montreal and Toronto), 256 MB, ~$2.19/mo. Why: WebSockets last a
    whole movie and rooms live in memory, so it must be one long-running
    process. Rejected: Vercel (serverless; sockets pinned per instance
    and time-capped), Render free (sleeps, may restart any time),
    Railway (works, but deploy-on-push skips the by-hand step), a VPS
    (too much for a first deploy).
  - Decided: `fly.toml` has `auto_stop_machines = 'off'`,
    `min_machines_running = 1`, and deploys use `--ha=false` (one
    machine = one `rooms` map). Auto-stop may be fine (open sockets
    count as traffic) but is unverified; revisit for cost later.
  - Decided: one origin. Go serves `frontend/dist` with an SPA fallback
    (unknown path → `index.html`); the frontend's relative URLs need no
    change and there's no CORS code. Rejected for now: separate
    frontend hosting. Its real upside is that frontend deploys don't
    restart Go (every deploy wipes live rooms), so don't deploy during
    a date night. Switching later is about an afternoon.
  - Decided: multi-stage `Dockerfile` (Bun build → Go static build with
    `CGO_ENABLED=0` → `alpine:3.24`). The final image mirrors the repo
    (`/app/backend/server`, `/app/frontend/dist`) so `../frontend/dist`
    works in dev and prod. Fly's generated GitHub deploy workflow was
    deleted (CI/CD comes later).
  - Decided: `parseSyncMessage` in `sync.ts` (try/catch + shape check,
    `position >= 0`), with allowed values as `as const` arrays and the
    types derived from them. Why: version skew after a deploy.
  - Decided: `send` drops the message if the socket isn't open
    (`readyState` check); the position check catches up.
  - Decided: "Create room" button on the home page does a full page
    load to `/room/CODE`. Why: `App` reads the code from the URL at
    render, so `pushState` wouldn't re-render; a router can come when
    there are real pages. Skipped: a "Copy link" button (the address
    bar does it).
  - Done so far: live at https://popcorn-for-two.fly.dev (deploy v2);
    phone on cellular + laptop on school wifi sync.
  - Done: root `README.md` (what it is, run locally, how sync works,
    checks, deploy with why `--ha=false`, limits); the Vite template
    README is gone. Go tests for room join / full / leave / partner
    lookup (`backend/main_test.go`).
  - Decided: tests before splitting `main.go`. Why: tests passing
    before and after prove the move changed nothing. Done: split into
    `rooms.go`, `handlers.go`, `spa.go`, short `main.go` (same package);
    tests renamed to `rooms_test.go`.
  - Done (session 25): passed a VPN test on the deployed app.
  - Decided: Tailwind v4 (Vite plugin) + shadcn/ui (Radix, Nova style).
    `@/` alias uses `paths` without `baseUrl` (TS 6 rejects it). Lint's
    fast-refresh rule is off for `components/ui` (CLI-generated files).
  - Done: cozy restyle. Home page has a pixel font (Pixelify Sans), a
    cream/terracotta theme and an animated isometric room
    (`CozyRoom.tsx`, written by Claude at the user's request). Room page
    has a framed 16:9 player; the debug Play/Pause/Skip buttons are gone
    (YouTube's controls drive sync).
  - Still to come: the first real date night with my partner (Montreal ↔
    Toronto). Not a blocker for M5.

- [ ] **M5: Pages and routing**
  - Done when: `/` shows the home page, `/room/CODE` shows the room,
    and any other URL shows a "page not found" page (no more
    `/banana` → home or `/x/y` → room "y").
  - Why next: (reordered in session 26, before the camera) the app
    gives no feedback on screen, and every later page (lobby, room
    errors) needs real routing first.
  - Decided: keep the SPA (one `index.html`, JS picks the page). The
    bad behavior comes from two loose checks, not from the SPA: Go's
    fallback serves `index.html` for any non-file path, and `App`
    reads `pathname.split('/')[2]`. Fix: match `/` and `/room/{code}`
    exactly; everything else → not found. Rejected: dropping the SPA
    (rebuilds page serving for nothing this fix doesn't give).
  - Decided: split `App` into `HomePage` and `RoomPage`. Why: hooks
    can't be called conditionally, so today each hook takes `code` and
    checks it inside. With `RoomPage` only rendered for a room, hooks
    need no check, and leaving the room = unmount = cleanup runs.
  - Not designed yet: a router library vs matching the path by hand;
    whether Go also returns a real `404` status for unknown paths
    (optional; Vite's dev server falls back too, so the frontend check
    is needed either way).

- [ ] **M6: Room status feedback**
  - Done when: the room page shows connecting / connected / room not
    found / room full / disconnected, instead of only the console.
  - Why next: Go already closes with 4004 / 4005, but
    `useRoomSocket` has no `onclose`, so the page never says why.
  - Not designed yet: where the state lives (`useRoomSocket` returns
    it?), what each screen offers (e.g. "Create a new room" button),
    whether "disconnected" retries.

- [ ] **M7: Camera (lobby + self-view)**
  - Done when: a Zoom-style lobby shows my webcam before I enter the
    room, and in the room my facecam sits over the video, locally and
    on the live site.
  - Why next: the call still lives in another app. First step to
    bringing it in: see my own face here.
  - Decisions (session 26, before the reorder):
    - Self-view sits over the video in a top corner. YouTube's
      controls live inside the iframe, so anything on top of the
      video hides them; the top corners keep the control bar clear.
      The two facecams start in opposite top corners so they never
      overlap at the start: room creator top-left, partner top-right,
      the same on both screens. M9 needs the server to tell each tab
      which seat it holds (and what "creator" means after a refresh).
    - Permission denied: the video still works and the self-view box
      says how to unblock (address bar; Chrome won't re-prompt after
      Block, so no retry button). No camera: no box at all.
    - Video only. The mic comes with M9.
    - The camera turns on by itself (no "start camera" click); a
      button turns it off and on again.
  - Found: a first `useCamera` (effect + `getUserMedia`) worked but
    was deleted for the reorder. Lesson for the redo: cleanup can run
    *before* `getUserMedia` resolves (StrictMode, or leaving fast), so
    the effect needs a `cancelled` flag and must stop a late stream's
    tracks. Leaving via the logo is a full page load, which hides the
    leak (Chrome frees the camera on unload).
  - Not designed yet: does the camera start on the lobby or the room;
    how the lobby hands the stream to the room; toggle as an `enabled`
    dep on the effect (recommended) vs `start`/`stop` functions.

- [ ] **M8: Drag and resize**
  - Done when: I can drag and resize my facecam anywhere over the
    video, without affecting my partner's layout.
  - Why next: a fixed camera box covers part of the video.
  - Known: the iframe swallows mouse events while the pointer is over
    it, so a drag that crosses the video loses its moves. Look at
    pointer capture. A facecam over YouTube's controls hides them.

- [ ] **M9: Call**
  - Done when: my partner and I see and hear each other in the app on
    the live site, both facecams can be dragged and resized, and we no
    longer need FaceTime.
  - Why next: I can only see my own face.

## Later
- CI/CD: when manual deploys get annoying
- Room expiry: empty rooms stay in memory until restart. Delete after
  N minutes empty (not at once: a refresh before the partner joins
  would kill the room).
- Ghost seat after navigating away: Chrome 149+ puts pages with an
  open WebSocket into the bfcache, so editing the URL in a room tab
  freezes the old page with its socket still open. Go never sees a
  leave and the room stays "full" until that tab is closed. React's
  effect cleanup doesn't run (nothing unmounts). Fix: close the socket
  on `pagehide`; on `pageshow` with `persisted`, rejoin (or reload).
  Workaround: close the tab, or create a new room.

## Not in the MVP
- Mini-games, movies beyond YouTube (separate brainstorming session)
- Accounts and login
- Browsers other than Chrome
