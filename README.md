# Popcorn for Two

Date night for long-distance couples: watch a YouTube video together, perfectly in sync, from two different cities.

**Live:** https://popcorn-for-two.fly.dev (Chrome)

**Status:** MVP in progress. Synced playback works. In-app video call is next; for now, call on FaceTime alongside it.

## How to use it

1. Open the site and click **Create room**.
2. Send your partner the URL from the address bar (`…/room/CODE`).
3. Either of you can play, pause, or seek, and the other's video follows within about a second. No host, no special controls: use YouTube's own player.

## Run it locally

You need [Go](https://go.dev/dl/) 1.27+ and [Bun](https://bun.sh/).

```sh
# Terminal 1: backend (port 8080)
cd backend
go run .

# Terminal 2: frontend (port 5173)
cd frontend
bun install
bun run dev
```

Open http://localhost:5173. To test sync, open the same room in two tabs.

In dev, Vite proxies `/api` (including WebSockets) to `:8080`, so the browser only ever talks to one origin.

To try the production setup instead, run `bun run build` in `frontend/`, then open http://localhost:8080. Go serves the built frontend itself.

## How it works

```
 Browser A                      Go server                      Browser B
 YouTube player  ── WebSocket ──▶  room ABC123  ── WebSocket ──▶  YouTube player
                 ◀─────────────    (2 seats)    ◀─────────────
```

- **Rooms:** `POST /api/rooms` creates a random 6-character code. Each browser joins over `GET /api/rooms/{code}/ws`. A room holds at most 2 people, and the server keeps rooms in memory.
- **Relay:** the server doesn't understand video. It forwards each message to the other person in the room.
- **Messages:** every message carries the full state (`{ type, position, state }`), so one message is enough to catch up.
  - `action`: someone played, paused, or seeked. The receiver copies it.
  - `sync`: sent every 2 s while playing. If the partner is more than 1 s **ahead**, jump forward. "Ahead wins" is how two peers agree without a host.
- **No echo loop:** applying a partner's action fires the local player's events too. Each side remembers the last agreed state and only sends real news.
- **Dead connections:** WebSocket ping every 15 s. After 30 s of silence, the seat is freed.

The reasoning behind each choice (and what was rejected) lives in [ROADMAP.md](ROADMAP.md).

### Project layout

```
backend/            Go server: rooms, WebSocket relay, serves the built frontend
frontend/src/
  sync.ts           Pure sync rules + message parsing (unit tested)
  hooks/            useRoomSocket, useYouTubePlayer, useSync, useHealth
Dockerfile          Bun build → Go build → small Alpine image
fly.toml            Fly.io config
```

## Checks

```sh
cd frontend && bun run test && bun run lint && bun run format:check
cd backend && go vet ./... && gofmt -l .
```

## Deploy

Deployed by hand to [Fly.io](https://fly.io) from the repo root:

```sh
fly deploy --ha=false
```

**Keep `--ha=false`.** Rooms live in one process's memory. With two machines, partners could land on different machines and never find each other's room. For the same reason, `fly.toml` keeps that one machine always on.

Every deploy restarts the server and wipes all rooms, so don't deploy during a date night.

## Limits

- Chrome only.
- Two people per room.
- Rooms are lost on restart or deploy, and empty rooms are never cleaned up (yet).
- Chrome's autoplay rules: a tab nobody has clicked yet can't start playing. Click anywhere on the page once.
- Changing the URL in a room tab can leave the room stuck "full". Close that tab to free the seat.

## Roadmap

See [ROADMAP.md](ROADMAP.md). Next up: your own webcam on the page, draggable/resizable facecams, then an in-app WebRTC call.
