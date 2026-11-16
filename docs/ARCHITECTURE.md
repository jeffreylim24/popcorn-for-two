# Architecture

How Popcorn for Two fits together: what runs where, what goes over the wire, and why it's built this way. For running, testing and deploying, see [README.md](../README.md).

## The big picture

```
 Browser A                          Go server (Fly machine)                  Browser B
 ┌──────────────┐                  ┌───────────────────────┐                ┌──────────────┐
 │ YouTube      │  room WebSocket  │ rooms map (in memory) │ room WebSocket │ YouTube      │
 │ player       │◀────────────────▶│  "ABC123" → 2 seats   │◀──────────────▶│ player       │
 │ camera + mic │                  │  relay, no logic      │                │ camera + mic │
 └──────┬───────┘                  └───────────┬───────────┘                └──────┬───────┘
        │                                      │ TURN credentials                  │
        │                                      ▼                                   │
        │                              Cloudflare TURN API                         │
        └═══════════ WebRTC media (direct, or relayed via Cloudflare TURN) ════════┘
```

Three channels, three jobs:

| Channel | Carries | Who decides |
|---|---|---|
| Room WebSocket (one per tab) | Playback sync, video choice, WebRTC signalling, camera/mic on/off | The two browsers, as equals |
| WebRTC peer connection | Camera and mic media | The browsers, peer to peer |
| HTTP | `POST /api/rooms` (create), the built frontend | The server |

The server is deliberately dumb. It holds seats and forwards messages, and it knows nothing about video positions or calls. Everything about "what should play now" lives in the browsers.

## Backend (`backend/`)

One Go `package main`, flat layout, no framework (standard `net/http` plus `github.com/coder/websocket`).

| File | Job |
|---|---|
| `main.go` | Reads env vars, picks the machine ID, builds the limiters and TURN functions, registers routes |
| `rooms.go` | The `rooms` map and its mutex: create, join, leave, partner lookup, current video, the idle sweeper |
| `handlers.go` | HTTP handlers: create room, join room (WebSocket upgrade + relay loop), heartbeat, Cloudflare TURN calls |
| `limiter.go` | Per-IP fixed-window counter (`allow(ip)`), reused for room creation and TURN fetches |
| `spa.go` | Serves `frontend/dist`, falling back to `index.html` for page URLs |

### Routes

| Route | Does |
|---|---|
| `GET /api/health` | Liveness check |
| `POST /api/rooms` | Creates a room, returns its **key** as plain text. 429 over the per-IP limit (10 per 10 min), 503 when this machine already holds 1000 rooms |
| `GET /api/rooms/{key}/ws` | Joins the room over a WebSocket, then relays until the connection drops |
| `GET /api/` (anything else) | 404, so API typos don't get `index.html` |
| `GET /` | The single-page app |

### Rooms, codes and keys

- A **code** is 6 random letters/digits. It's the key of the in-memory `rooms` map.
- A **key** is `{machine}-{code}`, for example `148ed193b95489-ABC123`. It's what the create call returns and what goes in the room URL (`/room/{key}`). The machine part is `FLY_MACHINE_ID` on Fly and `local` everywhere else. `parseRoomKey` splits on the last `-` (codes never contain one), and the frontend's `roomCode()` does the same to show just the code.
- A room is `{ conns (at most 2), videoID, emptySince }`. Every access goes through `roomsMutex`.
- A goroutine sweeps every minute and deletes rooms that have been empty for 10 minutes. Ten minutes still covers a refresh before the partner arrives.
- Rooms only live in memory, so a restart or deploy wipes them all.

### Joining a room (the WebSocket handler)

In order:

1. **Wrong machine?** If the key's machine isn't this one, answer `421` with `fly-replay: instance=<machine>;timeout=5s;fallback=force_self`, and Fly's proxy re-sends the request to the right machine. If that machine doesn't answer within 5 s, Fly sends the request back with a `fly-replay-failed` header, and the server answers 503. This all happens **before** the upgrade, because replay is an HTTP response.
2. **Upgrade**, then refuse with a close code if needed: `4004` for a room that doesn't exist (or a malformed key), `4005` for a full one. The server upgrades before refusing because a browser can't read the HTTP status of a failed upgrade, only a close code.
3. **TURN credentials.** Only seat holders get here. If the IP is under the TURN limit (30 per 10 min), the server asks Cloudflare for credentials that last 4 hours and sends `ice-servers` as the first message. If Cloudflare fails, or the IP is over the limit, the list is left out and the browser keeps its STUN-only fallback. The long-term TURN key never leaves the server.
4. **Roles.** If someone was already waiting, they get `partner-joined` and the newcomer gets `partner-present`. Different messages give each side a different WebRTC role.
5. **Late joiner catch-up.** If the room already has a video, send it as a `video` message.
6. **Heartbeat.** A goroutine pings every 15 s and closes the connection on a missed pong, so a dead tab (a sleeping laptop, dropped Wi-Fi) loses its seat within about 30 s.
7. **Relay loop.** Read a message, drop it if it's not a JSON object with a string `type` or if it uses a server-only type, remember `video` IDs (rejecting invalid ones), look the partner up, and write to them with a 5 s timeout. A message sent while you're alone is dropped.
8. **On exit** (close, error or missed pong): leave the room, tell the partner `partner-left`, then revoke the TURN credential at Cloudflare.

### Trust rules

- **Server-only types:** `ice-servers`, `partner-joined`, `partner-present` and `partner-left` from a client are dropped, not relayed. A forged `ice-servers` could route the partner's call through the sender's own TURN server, and a forged `partner-left` could hang up their call.
- The relay reads the type with `jsonFields`, which matches keys exactly, not case-insensitively. That way the server and the browser's `JSON.parse` agree on what a message's type is.
- The browsers don't trust each other's messages either: every incoming message is parsed and checked (`sync.ts`) before it touches the player, since the partner may be running older code after a deploy.

## Frontend (`frontend/src/`)

React + TypeScript (Vite), Tailwind, shadcn/ui. No router library and no global state library.

### Component and hook tree

```
App.tsx              matches the path by hand: /, /room/{key}, else NotFoundPage
├─ HomePage          "Create room" → POST /api/rooms → navigate to /room/{key}
└─ RoomPage          owns useCamera + useMic, so streams survive Join
   ├─ Lobby          camera/mic check, "Join"
   └─ RoomView       after Join, same URL
        useRoomSocket(key) ─── the one socket; hooks plug in with subscribe()
        ├─ useSync(socket)      ── useYouTubePlayer
        └─ useCall(socket, …)   ── RTCPeerConnection
        DraggableCam ×2, VideoPicker, RoomControls, FullscreenControls
```

### `useRoomSocket`: one pipe, many listeners

`useRoomSocket` opens the tab's single WebSocket and returns `{ send, status, reconnect, subscribe }`.

- `subscribe(listener)` adds a listener that receives every incoming message's text and returns an unsubscribe function. `useSync` and `useCall` each subscribe and ignore the types they don't handle.
- `status` turns the close codes into `'not-found'` (4004), `'full'` (4005) or `'disconnected'` (anything else). `RoomView` shows an overlay for each status.
- `send` drops messages when the socket isn't open. There's no queue.
- `reconnect` opens a fresh socket. There's no automatic retry.
- The socket opens one tick after mount. That way React StrictMode's dev-only mount → unmount → mount cancels the throwaway socket before it can take a seat.

### Message types on the room socket

| Type | From | Handled by | Payload |
|---|---|---|---|
| `ice-servers` | server | `useCall` | `iceServers` (missing = keep the fallback) |
| `partner-present` / `partner-joined` / `partner-left` | server | `useCall` | none |
| `video` | browser (server stores it) | `useSync` | `videoId` |
| `action` | browser | `useSync` | `position`, `state` |
| `sync` | browser | `useSync` | `position`, `state: 'playing'` |
| `playbackRate` | browser | `useSync` | `playbackRate` (0.25–2) |
| `offer` / `answer` / `candidate` | browser | `useCall` | SDP or ICE candidate |
| `camera` / `mic` | browser | `useCall` | `on` |

## Playback sync

There's no host. Either person can play, pause, seek or change the speed, and the other tab follows. The rules are pure functions in `sync.ts` (unit tested), and `useSync` wires them to the player and the socket.

**Every message carries the full state.** An `action` is `{ position, state }`, not "seek +10 s", so a single message is enough to catch up.

**Two kinds of playback message:**
- `action`: the user played, paused or seeked. The receiver copies it.
- `sync`: sent every 2 s while playing. If the partner is more than 1 s **ahead**, jump to their position. If they're behind, do nothing: their tab will jump when it gets your `sync`. This "ahead wins" rule lets two peers converge without a referee, and it's why `shouldCatchUp` uses a signed gap.

**Avoiding echo loops.** Applying a partner's action (`seekTo`, `playVideo`) fires the local player's own state-change events, which would send the action straight back. To prevent that, each tab keeps an `AgreedState`: `{ state, position, at, rate }`, the last state both sides agreed on, with a timestamp. `expectedPosition` predicts where the video should be now. `isNews` only lets a local event go out if it differs from that prediction by more than 1 s, or changes play/pause. The echo of a partner's action matches the prediction, so it isn't sent back.

**Things YouTube doesn't tell you:**
- There's no event for a seek while paused, so `useYouTubePlayer` polls every 500 ms while paused.
- A buffering stall isn't a user action. If buffering starts where the prediction says the video should be, the tab is just behind. The `playing` event that follows is not sent, because sending it would rewind the partner. The partner's next `sync` pulls this tab forward instead.
- Dragging the speed slider fires a change at every step, so rate changes are debounced by 150 ms and only the final rate is sent.
- The server sends the room's video on join, usually before the player is ready. The video ID waits in `pendingVideoRef` and gets loaded in `onReady`.

## The video call

`useCall` owns one `RTCPeerConnection` (called "the phone" in the code comments).

- **Signalling** goes over the room socket: `offer`, `answer` and `candidate` messages, relayed untouched.
- **Roles:** the newcomer (`partner-present`) creates the offer, and the one already waiting (`partner-joined`) answers. Since the server gives each side a different message, both never offer at once.
- **ICE servers:** `ice-servers` arrives before `partner-present` (the server guarantees the order), so the phone is created with Cloudflare's STUN + TURN list, or Google STUN only if that list is missing. Most calls connect directly. Networks that block direct connections (common on mobile data) relay through TURN. Either way, media is encrypted end to end (DTLS-SRTP).
- **No renegotiation:** the audio and video slots are created once, up front. Turning the camera off or on, or a mic that arrives late, swaps the track with `replaceTrack`. The partner learns about it from `camera` / `mic` messages, which drive the "camera off" and muted badges.
- **Partner leaves:** `partner-left` closes the phone and resets the partner's camera/mic state. A new partner starts a fresh call.

## Facecams

`DraggableCam` is a `position: fixed` box that can be dragged and resized with pointer events. It stores its position and size as **fractions of the window**, so a resized window keeps the layout proportional, and its height comes from a 16:9 aspect ratio. Each screen keeps its own layout, and layouts are not synced.

Never put a CSS transform on an ancestor of the cams: a transform turns that ancestor into the containing block for `position: fixed`, and the cams would measure from it. Animate opacity there instead.

## Scaling and deployment

```
                 ┌──── Fly proxy ────┐
 browser ──────▶ │ any machine       │── key's machine ≠ me → 421 + fly-replay ──┐
                 └───────────────────┘                                           ▼
                                                          machine that holds the room
```

- **Sticky routing, no shared store.** A room is always two people, so it never needs to span machines. The room key carries its machine's ID, so the link itself routes the joiner. There's no lookup table, no Redis and no central router.
- **Capacity is per machine.** The cap is 1000 rooms per machine. Load tests on the 256 MB VM hit an out-of-memory kill around 1300–1500 couples, so 1000 leaves a margin. Memory is the limit, not CPU. The method and numbers are in [LOADTEST.md](LOADTEST.md).
- **Deploys** are manual (`fly deploy` from `main`). The Docker image builds the frontend with Bun, builds the Go binary, and ships both in a small Alpine image where Go serves the SPA and the API from one origin. In dev, Vite proxies `/api` (WebSockets included) to `:8080` for the same effect, which is why there's no CORS code.
- **Load-test mode** (`LOAD_TEST=1`) swaps in fake TURN and lifts the per-IP limits. The server refuses to start in this mode on the production app.

## Testing

| Where | What | How |
|---|---|---|
| `frontend/src/*.test.ts` | Pure logic: sync rules and parsers, link parsing, room helpers | Vitest |
| `backend/*_test.go` | Rooms, limiter, machine ID, and the real join handler on `httptest` with a fake TURN function | `go test ./...` |
| `loadtest/` | Many couples at once: relay latency, lost messages, pairing | k6 |

The logic that's hard to get right sits in pure functions (`sync.ts`, `parseRoomKey`, `isServerOnlyType`), so it can be tested without a browser or a network. CI runs both suites on every PR (see [README.md](../README.md#checks)).

## Known limits

The [Limits section of the README](../README.md#limits) lists them. The architectural ones: rooms are lost on deploy, two people per room, a silently dead partner keeps their seat for up to about 30 s, no automatic reconnect, and a network change mid-call drops the call.
