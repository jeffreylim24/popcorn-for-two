# Popcorn for Two

Date night for long-distance couples: a video call and a YouTube video, perfectly in sync, from two different cities.

**Live:** https://popcorn-for-two.fly.dev (Chrome)

**Status:** MVP done. Synced playback plus an in-app video call with draggable, resizable facecams. Future work lives in [GitHub issues](https://github.com/jeffreylim24/popcorn-for-two/issues) and the backlog table in [ROADMAP.md](ROADMAP.md).

## How to use it

1. Open the site and click **Create room**.
2. Send your partner the room link (**Copy link**, or the URL: `…/room/CODE`).
3. Each of you checks camera and mic in the lobby, then joins. The call starts as soon as you're both in.
4. Paste a YouTube link. Either of you can play, pause, or seek, and the other's video follows within about a second. No host, no special controls: use YouTube's own player.
5. Drag and resize the facecams anywhere on your screen. Each screen keeps its own layout.

## Run it locally

You need [Go](https://go.dev/dl/) 1.27+, [Bun](https://bun.sh/), and a [Cloudflare TURN key](https://developers.cloudflare.com/realtime/turn/) (free tier).

The server refuses to start without the TURN key. Put it in `backend/.env` (gitignored, never commit it):

```sh
TURN_KEY_ID=...
TURN_KEY_API=...
```

```sh
# Terminal 1: backend (port 8080)
cd backend
set -a; source .env; set +a
go run .

# Terminal 2: frontend (port 5173)
cd frontend
bun install
bun run dev
```

Open http://localhost:5173. To test sync and the call, open the same room in two tabs. On macOS, Chrome needs **Local Network** permission (System Settings → Privacy & Security), or two tabs on one Mac can't connect the call.

In dev, Vite proxies `/api` (including WebSockets) to `:8080`, so the browser only ever talks to one origin.

To try the production setup instead, run `bun run build` in `frontend/` and `go run .` in `backend/`, then open http://localhost:8080. Go serves the built frontend itself.

## How it works

```
 Browser A                       Go server                       Browser B
 YouTube player ── WebSocket ──▶  room ABC123  ── WebSocket ──▶ YouTube player
                ◀──────────────    (2 seats)   ◀──────────────
 camera + mic   ◀═══════════ WebRTC call (direct, or via TURN) ═══════════▶
```

**Rooms**
- `POST /api/rooms` creates a random 6-character code. Each browser joins over `GET /api/rooms/{code}/ws`. A room holds at most 2 people, and the server keeps rooms in memory.
- The server doesn't understand video or calls. It forwards each message to the other person in the room. It only reads two things: the current video (so a late joiner gets it) and joins/leaves (it sends `partner-present`, `partner-joined`, `partner-left`).

**Sync**
- Every playback message carries the full state (`{ type, position, state }`), so one message is enough to catch up.
  - `action`: someone played, paused, or seeked. The receiver copies it.
  - `sync`: sent every 2 s while playing. If the partner is more than 1 s **ahead**, jump forward. "Ahead wins" is how two peers agree without a host.
- **No echo loop:** applying a partner's action fires the local player's events too. Each side remembers the last agreed state and only sends real news.

**Call**
- WebRTC, peer to peer. The room WebSocket doubles as the signalling channel (`offer`, `answer`, `candidate`). The newcomer makes the offer.
- Audio and video slots are created once, up front. Turning the camera off or on swaps the track (`replaceTrack`), so there's no renegotiation. The partner hears about it through `camera` / `mic` messages.
- **Routes:** when someone takes a seat, Go asks Cloudflare for TURN credentials that expire in 4 hours and sends them as the first message on the room socket (`ice-servers`). Only a seat holder gets them, the long-term key never leaves the server, and clients can't fake server-only messages. If Cloudflare fails, the call falls back to Google STUN only.
  - Most calls connect directly. When a network blocks that (common on mobile data), media goes through Cloudflare's TURN relay. Either way it's encrypted end to end (DTLS-SRTP).

The reasoning behind each choice (and what was rejected) lives in [ROADMAP.md](ROADMAP.md).

### Project layout

```
backend/              Go server, one package: routes, env + load-test mode
                      (main.go), rooms + sweeper (rooms.go), WebSocket relay +
                      ICE servers (handlers.go), per-IP limits (limiter.go),
                      serves the SPA (spa.go)
frontend/src/
  pages/              HomePage, RoomPage (lobby → room), NotFoundPage
  components/         Lobby, RoomView, DraggableCam, controls; ui/ is shadcn output
  hooks/              useRoomSocket, useSync, useYouTubePlayer, useCall,
                      useCamera, useMic, useFullscreen
  sync.ts             Pure sync rules + message parsing (unit tested)
  youtube.ts, mic.ts  Link → video ID, mic label (unit tested)
loadtest/             k6 scripts: couples.js (capacity), rooms.js (create limit)
.github/workflows/    CI: frontend and backend checks on every PR and push to main
Dockerfile            Bun build → Go build → small Alpine image
fly.toml              Fly.io config (fly.load.toml: the load-test copy)
```

## Checks

CI (GitHub Actions) runs these on every pull request and every push to `main`, frontend and backend in parallel. To run them yourself:

```sh
cd frontend && bun run test && bun run lint && bun run format:check && bun run build
cd backend && go test ./... && go vet ./... && gofmt -l .   # gofmt must print nothing
```

## Load test

`loadtest/couples.js` ([k6](https://k6.io/)) acts out many couples at once: each one creates a room, both partners join, and each sends a `sync` every 2 s, like the real app. It measures relay latency, lost messages, and whether every couple got paired.

Run it against a server in load-test mode (`LOAD_TEST=1`: fake TURN, no TURN keys needed, per-IP limits off). The server refuses load-test mode on the production app.

```sh
# Terminal 1
cd backend && LOAD_TEST=1 go run .

# Terminal 2 (COUPLES, RAMP_S, HOLD_S, P95_LIMIT_MS are optional)
k6 run -e COUPLES=500 loadtest/couples.js
```

**Result on production's VM (256 MB, 1 shared CPU):** about 1250 couples at once, with relay p95 under 15 ms. 1500 couples runs out of memory and the machine restarts. Memory is the limit, not CPU, so plan on ~1000 couples; more needs a bigger VM. The full numbers, and how to run it on Fly, are in [ROADMAP.md](ROADMAP.md) under "Load test results".

## Contributing workflow

Every code change starts from a GitHub issue, goes on its own branch (`feat/…`, `fix/…`) off an up-to-date `main`, and lands through a pull request that says `Closes #N`. Deploy from `main` after merging.

## Deploy

Deployed by hand to [Fly.io](https://fly.io) from the repo root. Set secrets **before** the first deploy that needs them (the server won't start without them):

```sh
fly secrets import --stage < backend/.env   # values never hit shell history
fly secrets list                            # names + digests, never values
fly deploy --ha=false
```

**Keep `--ha=false`.** Rooms live in one process's memory. With two machines, partners could land on different machines and never find each other's room. For the same reason, `fly.toml` keeps that one machine always on.

Every deploy restarts the server and wipes all rooms, so don't deploy during a date night.

## Limits

- Built and tested for Chrome. Phones work too: the lobby and room fit a phone screen and the cams start side by side. On an iPhone, fullscreen fills the browser window instead of the whole screen (iPhone browsers can't make a page element fullscreen).
- Two people per room.
- One server holds about 1000 couples at once with a safe margin (see [Load test](#load-test)).
- Rooms are lost on restart or deploy. A room that has been empty for 10 minutes is deleted, so a link to an abandoned room stops working.
- Room creation is limited to 10 per IP per 10 minutes (HTTP 429), and the server holds at most 5,000 rooms at once (HTTP 503).
- A partner whose connection dies silently (sleep, Wi-Fi drop) keeps their seat for up to about 30 s, until the server's heartbeat (a ping every 15 s) notices.
- Chrome's autoplay rules: a tab nobody has clicked yet can't start playing. Click anywhere on the page once.
- Changing the URL in a room tab can leave the room stuck "full". Close that tab to free the seat.
- A network change mid-call (Wi-Fi → hotspot) drops the call. Reconnect to start a fresh one.
