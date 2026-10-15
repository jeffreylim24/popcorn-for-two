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
  - Decided: echo guard. Before applying a remote message, the
    receiver writes a note in a ref (e.g. "paused"). The
    `onStateChange` sender, if the event matches the note, sets the
    note to `null` and returns without sending. One note covers one
    echo (otherwise it swallows the user's next real pause). Needed
    because `onStateChange` fires later as its own event and can't
    tell a click from the code's own `pauseVideo()`.
  - Risk to test: if YouTube fires no `onStateChange` for a no-op
    (pausing an already-paused video), the note is never cleared.
  - Found: a seek while paused fires no `onStateChange` (state stays
    paused; buffering only happens on the next play). Seeking while
    playing fires buffering → playing, so it already sends.
  - Open: keep YouTube's own controls, or hide them (`controls: 0`,
    `disablekb: 1`) and build custom ones? The page can't see clicks
    inside the cross-origin iframe, so keeping them means detecting
    paused seeks by checking the position while paused.
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
  - Done so far: each tab connects on load; play/pause in one tab
    sends an `action` that the other tab parses and logs.
  - Next: the receiver applies an `action` (type the parsed message as
    `SyncMessage`; play/pause by `state`; `seekTo` if the gap is over
    1 s). Then the echo guard.

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
