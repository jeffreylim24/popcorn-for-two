# Roadmap

What's planned next for Popcorn for Two. The current release is
[v1.1.0](https://github.com/jeffreylim24/popcorn-for-two/releases/tag/v1.1.0);
see the [releases](https://github.com/jeffreylim24/popcorn-for-two/releases)
for what has shipped so far.

- **Now:** HIGH priority, or in progress.
- **Next:** MEDIUM priority.
- **Later:** LOW and VERY LOW, plus work that needs more design first.

Priorities change as real date nights show what matters. Each item links
its GitHub issue when it has one; the issue holds the details. Finished
items leave this file (they live in closed issues and PRs). Load test
numbers are in [docs/LOADTEST.md](docs/LOADTEST.md).

## Now

- **Synced drags: the same cam layout on both screens**
  ([#5](https://github.com/jeffreylim24/popcorn-for-two/issues/5), HIGH).
  The end goal of the call milestone. Needs a design for seats, clashing
  drags, and different screen shapes.

## Next

Reliability
- **Ghost seat after editing the URL in a room tab**
  ([#6](https://github.com/jeffreylim24/popcorn-for-two/issues/6), bug,
  MEDIUM). The bfcache keeps the old socket alive, so the room says
  "full"; the heartbeat can't catch it.
- **Reconnect the room socket automatically, with backoff**
  ([#7](https://github.com/jeffreylim24/popcorn-for-two/issues/7)). A
  blip needs a manual Reconnect today. ICE restart and S3's "a machine
  died" both build on it.
- **Call status indicator: connecting / reconnecting / failed**
  ([#11](https://github.com/jeffreylim24/popcorn-for-two/issues/11)). A
  failed call is mostly silent today.
- **Tests for `joinRoomHandler`** (no issue yet). The harness exists
  (`startJoinServer`, fake TURN) and covers join and ICE. Still
  untested: relay, partner notices, room video.

Security
- **Harden room codes against guessing**
  ([#9](https://github.com/jeffreylim24/popcorn-for-two/issues/9)). The
  code is the only gate to a partner's camera. Reuse `limiter.go`, count
  every attempt (including not found), and tune it with #7's backoff.

Features
- **Pick camera, mic and speakers; balance partner voice vs the movie**
  ([#12](https://github.com/jeffreylim24/popcorn-for-two/issues/12)).
  Volume balance is the likely first slice.
- **Text chat in the room**
  ([#34](https://github.com/jeffreylim24/popcorn-for-two/issues/34)). A
  fallback when a mic fails. Rides the room socket.
- **Screen share**
  ([#35](https://github.com/jeffreylim24/popcorn-for-two/issues/35)).
  Watch things that aren't on YouTube. A new track on the call
  (renegotiation), and screen video through TURN is paid bandwidth.
- **Bring a cam to the front** (issue to file). Both cams are `z-10`, and
  the partner cam renders after yours, so your own cam always hides
  behind your partner's. Idea: bring a cam to the front when you click
  or touch it, like desktop windows.
  - To be decided: double-click or plain click? If layouts sync (#5),
    does the stacking order sync too?
- **Floating emotes, with a mute toggle** (issue to file). Emotes float
  up over the video, like Instagram Live; a local toggle hides the
  partner's emotes on your screen. Cheap over the existing socket, and
  it makes "Relay message size/rate limit" (Later) more relevant.
- **More video sources** (issue to file). One player interface with
  more than one provider behind it:

  | Source | Synced play / pause / seek? |
  |---|---|
  | Twitch, Vimeo | Yes, through their player APIs (Twitch live streams can't seek) |
  | Direct files (`.mp4`, HLS) | Yes, with a plain `<video>` |
  | Any other website | No: a page can't control another site's player. Screen share (#35) covers it; TwoSeven-style control needs a browser extension |

  - To be decided: one umbrella issue, or one per provider?

## Later

### Scaling: S3, grow and shrink the machine pool (needs more design)

S1 (sticky routing, #32) and S2 (load tests, cap of 1000 per machine,
#37) are done. Prod runs 1 machine by choice.

- Fly never creates machines; autostart only wakes stopped ones from a
  pool you made (`fly scale count`). Stopped machines cost only disk
  ($0.15/GB per 30 days).
- **Autostop must stay off** (`auto_stop_machines = "off"`,
  `auto_start_machines = true`): Fly's proxy may stop a machine that
  still has open WebSockets, which would end live dates. The app shuts
  itself down instead, since only it knows its rooms.
- Fill-first on the way up comes from `soft_limit` (~80% of capacity):
  a second machine wakes only when the first is over it.
- Open: draining on the way down. Under `soft_limit` the proxy spreads
  creates over every running machine, so no map ever empties. Needs a
  rule for which machine drains and how it refuses creates (likely
  `fly-replay` with `elsewhere=true`). Also a race: "map is empty →
  exit" while a create lands on it.
- Also later: Prometheus metrics + Grafana. Depends on #7 for "what
  happens when a machine dies".

### LOW

- **Resize a cam from all four corners** (issue to file). Today only the
  bottom-right corner resizes (so `x, y` stay put). From any other
  corner, the opposite corner stays fixed, so `x` and/or `y` move during
  a resize. Same file as "Bring a cam to the front" (`DraggableCam`);
  touches the bounds logic behind #1.
- **Background cutout ("greenscreen")** (issue to file). Only the face
  and body show, with no frame. A segmentation model (e.g. MediaPipe)
  finds the person pixels each frame. WebRTC video has no transparency,
  so the *receiver* cuts out the partner's video; the sender only says
  "cut me out" over the socket. CPU-heavy on every frame.
  - To be decided: cutout only, or one "background effects" issue
    (blur, replace, cutout)?
- **Shorter TURN TTL + refresh while seated.** Limits how long a leaked
  credential works: Go re-sends `ice-servers`, the browser applies it
  with `pc.setConfiguration()`. Doesn't stop someone who keeps the seat
  (#8/#9 and a usage alert cover that).
- **Relay message size/rate limit.** The server relays anything, so one
  client could flood its partner.
- **Unknown `GET /api/...` returns `index.html` with 200.** Should be a
  404; confusing when debugging.
- **Server hardening:** `http.Server` timeouts (`ListenAndServe` has
  none: slowloris), and no `/assets/` directory listing.
- **Container:** non-root user; keep room codes out of logs (codes are
  secrets).
- **Send a `sync` right when buffering ends.** Small sync-quality gain.
- **ICE restart on a network change.** Keeps the call instead of
  starting fresh. A renegotiation, so it needs a rule for who restarts.
  Needs #7 first.
- **Auto-switch devices on unplug** (`devicechange`). Belongs with #12.
- **"Hide my IP" (relay-only) toggle.** `iceTransportPolicy: 'relay'`,
  like WhatsApp and Signal. Costs TURN bandwidth.
- **More motion:** partner's cam springs in, cams fade on show/hide, lift
  while dragging, lobby preview fades in. Animate opacity/scale on the
  cams only, never position (`DraggableCam` owns it).
- **Search YouTube in-app.** Pasting a link works. Needs a YouTube Data
  API key kept server-side (a secret, plus quota).
- **Mini-games.** Big; needs its own brainstorm.
- **Other browsers**, including iPhone (every browser there is Safari
  underneath). Matters if a partner is on an iPhone. Debug iPhone pages
  with Safari's Web Inspector (iPhone Settings → Apps → Safari →
  Advanced, plus Chrome's own switch).
- **Logging / uptime alerts** (`slog`, a Fly health check on
  `/api/health`). Otherwise outages are reported by your partner.

### VERY LOW

- **Facecam partly off-screen after the window gets shorter**
  ([#1](https://github.com/jeffreylim24/popcorn-for-two/issues/1), bug).
  The next drag fixes it.
- **Phone made for a partner who already left.** The newcomer pauses on
  `await iceReadyRef` (~200 ms); if `partner-left` lands in that pause,
  it makes a phone + offer for nobody. Harmless today (Go drops it; the
  next `newPhone()` closes it). **Fix first if** the server ever queues
  messages for absent partners, something reads "has a phone" as "in a
  call", or longer awaits join this path (#7, #12). Fix: remember
  "partner here" in a ref, re-check after the await.
- **"Starting mic…" label.** While the mic starts, the button says "Mic
  on" next to a crossed-out icon (`micLabel` reads the toggle, the icon
  reads `micLive`).
- **Font flash on slow networks.** Pixelify Sans downloads only once
  text using it renders. Fix: `<link rel="preload">` the .woff2 in
  `index.html`.
- **`bun audit`** (`braces` via the shadcn CLI, dev-only). Not in the
  bundle; `bun audit fix`.
- **Shared close codes (Go ↔ TS).** Two numbers that rarely change.
- **Refactors:** a `useCamera`/`useMic` helper, `useCall` send
  duplication, `joinRoomHandler` vs `sendJSON`. Readability only.
- **Playback speed sync.** Rarely used on date nights.
- **Accounts / login.** Links work fine for two people.

## Docs to write

- **Feature list / user guide** (`docs/`): what the app does today and
  how to use it. Takes over the "what exists" job that finished
  milestones used to do here.
