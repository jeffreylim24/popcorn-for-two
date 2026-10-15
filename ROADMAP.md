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

- [ ] **M3: Sync**
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
  - Decided: messages are typed as `SyncMessage` in `App.tsx`.
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
  - Next: the end-of-M3 cleanup.
  - End of M3 cleanup (from the code review): split `App.tsx` into
    custom hooks, pull sync decisions into pure functions with first
    frontend tests, remove the Vite demo leftovers. Includes
    `expectedPosition(last, nowMs)` as an exhaustive `switch` on
    `state` (a `never` default), so adding a state like `'ended'`
    makes TS flag every unhandled spot. Name the
    `{ state, position, at }` type (e.g. `AgreedState`).
  - Before deploy (M4): wrap `JSON.parse` in `try/catch` and check the
    message shape. `WebSocket.send()` throws while the socket is still
    connecting (`sendAction` and `sendSync`); check `readyState` first.

- [ ] **M4: First deploy (by hand)**
  - Done when: the app runs on a public HTTPS URL, and my partner and I
    watch a video in sync from our own networks (call on FaceTime).
  - Why next: two tabs on one laptop hide real lag, HTTPS, and home
    routers. Also: first real date night.
  - Decide at the start: hosting; Go serves the built frontend (one
    origin) vs separate hosting (needs CORS).

- [ ] **M5: Camera**
  - Done when: my own webcam shows on the page, locally and on the
    live site.
  - Why next: the call still lives in another app. First step to
    bringing it in: see my own face here.

- [ ] **M6: Drag and resize**
  - Done when: I can drag and resize my facecam anywhere over the
    video, without affecting my partner's layout.
  - Why next: a fixed camera box covers part of the video.

- [ ] **M7: Call**
  - Done when: my partner and I see and hear each other in the app on
    the live site, both facecams can be dragged and resized, and we no
    longer need FaceTime.
  - Why next: I can only see my own face.

## Later
- CI/CD: when manual deploys get annoying
- Room expiry: empty rooms stay in memory until restart. Delete after
  N minutes empty (not at once: a refresh before the partner joins
  would kill the room).

## Not in the MVP
- Mini-games, movies beyond YouTube (separate brainstorming session)
- Accounts and login
- Browsers other than Chrome
