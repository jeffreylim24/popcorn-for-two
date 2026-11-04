# S1: Several machines, one room map each

Issue: [#32](https://github.com/jeffreylim24/popcorn-for-two/issues/32).
Roadmap: "Scaling out", S1. Planned 2026-11-03.

## Goal

Run Popcorn for Two on 2+ Fly machines. Partners who land on different
machines still end up in the same room.

**Done when:** two machines run with `--ha=false` dropped; a room made
on machine A can be joined by someone whose request first lands on
machine B; tests cover the local, replay and malformed cases; the README
deploy section is updated.

## Why

- One 256 MB machine holds ~1250 couples, then an out-of-memory kill
  ends every date on it (#21, ROADMAP "Load test results").
- Memory grows with **connections** (~80 KB of process memory per
  couple: goroutines, socket buffers, TLS state). The rooms map itself
  is tiny. More capacity = more machines.
- Today we can't run two: partners on different machines never find
  each other's room, because each process has its own `rooms` map.

## Design

### Sticky routing: every room lives on one machine

A room is always exactly two people, so it never needs to span
machines. Pin each room to the machine that created it and send both
partners there.

```
            create                              join (lands on B)
Alice ──▶ [Fly proxy] ──▶ Machine A        Bob ──▶ [Fly proxy] ──▶ Machine B
                          makes room                               "not mine"
                          "A-xY3kQ9"                               fly-replay: instance=A
                                                    [Fly proxy] ──▶ Machine A
                                                                   upgrade, join room
```

Each machine keeps its own `rooms` map, `roomsMutex`, sweeper and cap,
all unchanged.

### Rejected alternatives

| Option | Why not |
|---|---|
| Redis for room state + pub/sub relay | Costs per command (a k6 run could use up Upstash's free 500K/month); adds a shared store and a new failure point; saves almost no memory (the cost is per connection, and sockets can't move into Redis anyway) |
| A central router that remembers room → machine | Single point of failure, the next bottleneck, and its table is shared state needing a lock again. Fly's proxy already does the redirect |
| One global mutex in Redis | Holding a lock across a network call (~1 ms) would make every room wait on every other room |

### The room code carries the machine ID

- Each Fly machine has an ID in the `FLY_MACHINE_ID` env var (a short
  hex string).
- The machine that gets `POST /api/rooms` hosts the room. Fly's load
  balancer already chose that machine, so no picking is needed.
- The code it returns is `{machineID}-{random6}`. The joiner's link
  carries it, so no one has to remember which machine owns what.
- The frontend needs no change: `App.tsx` accepts any non-empty
  `/room/{code}`, and `useRoomSocket` passes the code through to
  `/api/rooms/{code}/ws` unchanged. (Check the longer code anyway.)

### `fly-replay`

A response header that tells Fly's proxy to resend the request to
another machine: `fly-replay: instance=<machine-id>`. The browser never
sees it; Fly does the redirect inside its network.

- **Must come before the WebSocket upgrade.** An upgrade is the server
  answering `101 Switching Protocols`; after that the HTTP exchange is
  over and no other response (like a replay) can be sent. Fly's docs:
  the replaying machine must not upgrade; the target machine does.
- Requests over 1 MB can't be replayed. A join request is tiny.

### Join, step by step

```
GET /api/rooms/{code}/ws arrives at some machine
  ├─ code malformed (not "{machine}-{random}")  → room not found, no replay
  ├─ machine part ≠ my ID                        → respond with fly-replay, no upgrade
  └─ machine part = my ID                        → upgrade, then the existing join logic
                                                   (unknown code → 4004 as today)
```

It can't loop: the replayed request lands on the right machine, where
the IDs match.

### Local dev and tests

`FLY_MACHINE_ID` is unset in `go run` and `go test`. Rule: an empty ID
means "every room is mine", so dev and the existing handler tests work
with one process.

## Edge cases

| Case | What happens | Status |
|---|---|---|
| Hand-edited machine part | Replayed to that machine, which looks up the code in its own map, finds nothing, returns 4004. The local lookup is the guard | Covered by design |
| Machine part names a machine that doesn't exist | Fly's proxy fails the replay. Unknown: what the browser sees (probably not a clean 4004) | **Verify on Fly** |
| Owner machine crashed / restarted | Its rooms are gone (memory). Same as today with one machine | Accepted; #7 (reconnect) should show a clean "room gone" |
| Deploy | Every machine restarts; all rooms lost. Same as today | Accepted; still don't deploy during date nights |
| Old 6-char links from before the deploy | Malformed → not found. All rooms die on deploy anyway | Accepted |

## Things that change by having several machines

- **Room cap (`maxRooms`) becomes per machine.** Correct: it bounds
  memory, which is per machine. Lowering it to ~1000 is S2.
- **Per-IP create limit (10 / 10 min) becomes per machine.** Creates are
  spread by the load balancer, so an IP gets up to n × 10. See open
  questions.
- **Per-IP TURN limit (30 / 10 min)** is counted on the room's owner
  machine, since joins are replayed there.

## Implementation steps (each: pseudocode → syntax sheet → you type → test)

1. **Machine identity.** `main.go` reads `FLY_MACHINE_ID` once and
   passes it to whatever needs it (like `getICE`, `hb` today), so tests
   can pretend to be machine A or B.
2. **Create.** `createRoom` returns `{machineID}-{random6}`. Tests: the
   code starts with the machine ID; the empty-ID case.
3. **Parse.** A pure helper splits a code into (machine, ok). Table
   tests: valid, no separator, empty parts, extra separators.
4. **Join routing.** In `joinRoomHandler`, before `websocket.Accept`:
   malformed → not found; other machine → `fly-replay` header and
   return; own → carry on. Tests with `httptest`: the replay response
   has the header and no upgrade happened.
5. **Fly.** Try it on the load-test app (`fly.load.toml`) with 2
   machines first. Force a request onto a chosen machine with the
   `fly-force-instance-id` request header to test the replay path on
   purpose. Check the "nonexistent machine" case.
6. **Production.** Update the README deploy section (`--ha=false` →
   machine count), `fly scale count 2`, deploy, live test with a partner.

## Open questions

1. ~~Code format~~ **Decided:** `{machineID}-{random6}`. `-` is safe: the
   random part is letters + digits, and Fly machine IDs look like 14
   lowercase hex chars (e.g. `0e286072f65186`; the format isn't
   documented as a guarantee). The `rooms` map key is **only the random
   part**: the machine part has done its job once the request reaches
   the right machine. Our Go code splits the code; Fly only reads the
   `fly-replay` header we set. Uniqueness only needs checking per
   machine, since the prefix makes codes unique across the fleet.
   Still open: which `-` to split on, so that a `-` ever appearing in a
   machine ID couldn't break parsing.
2. ~~How machine identity reaches the code~~ **Decided:** passed in.
   `main` reads `FLY_MACHINE_ID` once and passes it to
   `createRoomHandler` and `joinRoomHandler`, like `getICE`/`turnLimit`.
   Why: tests act as machine A in one case and B in another; a package
   variable would be shared, so parallel tests would race on it (last
   write wins → flaky failures).
3. ~~Local dev machine part~~ **Decided:** `main` reads
   `FLY_MACHINE_ID` and, if empty, uses `"local"`; that value is passed
   in like any other. Codes look like `local-xY3kQ9`, and the join check
   takes the same path as production (`"local" == "local"` → handle
   here). Only `main` knows about dev: no dev/prod flag, no `if dev`
   anywhere else, no `.env` entry (Fly sets the var itself). Rejected:
   `"-xY3kQ9"` (the parser's "empty part → malformed" rule would reject
   every local code) and bare `"xY3kQ9"` (a second format to parse).
4. ~~Per-IP create limit × n~~ **Accepted.** The limit stops one person
   grabbing every room; with creates spread by the load balancer, each
   machine still sees ~10 per IP, so per-machine protection is
   unchanged. Only the fleet total grows (2 machines). If it ever
   matters: a shared Redis counter (`INCR` + `EXPIRE` per create: one
   command per create, cheap). Rejected: route creates by IP hash
   (piles one IP on one machine, breaks with S3), split 10/n (needs n,
   uneven).
5. What status code goes with the `fly-replay` response (Fly ignores the
   body; check the docs at the syntax-sheet step).
6. What the browser sees when the replay target doesn't exist, and
   whether the frontend should treat it as "room not found".
