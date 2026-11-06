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
  `/api/rooms/{code}/ws` unchanged. (Checked in dev, session 46.)

**Naming (session 46):** the **key** is the whole string in the link and
the URL (`local-xY3kQ9`); the **machine** is the part before the last
`-`; the **code** is the 6-char part after it, the `rooms` map key (as
`rooms.go` already used the word). The route is `GET /api/rooms/{key}/ws`.
The frontend's own variable is still called `code` and holds the key;
it treats it as opaque.

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

As built (session 46), in this order:

```
GET /api/rooms/{key}/ws arrives at some machine
  machine, code, ok := parseRoomKey(key)
  ├─ ok and machine ≠ my ID → log, fly-replay: instance=<machine>, 421, no upgrade
  ├─ Accept (the upgrade)
  ├─ !ok (malformed)        → log, close 4004 (same as an unknown room)
  └─ joinRoom(code, …)      → the existing join logic (unknown code → 4004)
```

- Parsing comes before `Accept` (the replay check needs `machine`); the
  malformed close comes after it, because a browser can't read the HTTP
  status of a refused upgrade (it only reports `1006`), only a close
  code. So "upgrade, then close 4004" is the only way to show "Room not
  found". `ok &&` keeps junk from being replayed to `instance=`.
- **421 Misdirected Request** with the replay: Fly acts on the header
  whatever the status, so it only shows when no proxy is in front (dev,
  tests). In dev, a key for another machine therefore shows "Connection
  lost" (421 → `1006`); only a hand-edited link can produce one.
- It can't loop: the replayed request lands on the right machine, where
  the IDs match.

### Local dev and tests

`main` turns "not on Fly" (`FLY_APP_NAME` empty) into machine ID
`"local"`, and refuses to start on Fly if `FLY_MACHINE_ID` is empty
(otherwise every machine would be `"local"` and joins would silently
4004). Tests build handlers with the ID they want (`"local"`, `"A"`).

## Edge cases

| Case | What happens | Status |
|---|---|---|
| Hand-edited machine part naming a real machine | Replayed there; its map doesn't have the code → 4004. The local lookup is the guard | Covered by design |
| Junk machine part (not a valid Fly ID) | **Tested s. 46:** Fly's proxy answers `400` at once (`[PU01] could not parse machine ID`), even for 14 hex chars or a real ID with one digit changed (IDs have internal structure). Browser: "Connection lost" | Accepted: only a hand-edited link |
| Real ID of a destroyed machine | **Tested s. 46** (`fly machine destroy`): the proxy keeps retrying; curl timed out at 30 s. Browser: stuck on "Connecting…", then "Connection lost". Happens after scale-down / host replacement, routinely with S3 | **Fix: step 4b** |
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

1. ✅ **Machine identity** (`9074224`). `main` reads `FLY_APP_NAME` and
   `FLY_MACHINE_ID` once, passes `machineID` as the last argument of both
   handler constructors, logs `machine ID: …` at startup.
2. ✅ **Create** (`7039657`). `createRoom` is unchanged (still returns
   the code); `createRoomHandler` sends `machineID + "-" + code`, so
   `rooms.go` never sees the machine part. Test: key starts with `"A-"`,
   the code matches `roomCodePattern`, and the code is in `rooms`.
3. ✅ **Parse** (`b062a24`). `parseRoomKey(key) (machine, code, ok)` in
   `rooms.go`, split on the **last** `-` (codes never have one, so a `-`
   in a machine ID can't break it). Malformed: no `-`, empty machine,
   code not 6 letters/digits. The machine part isn't validated: Fly
   does that (see edge cases). Table test with 10 rows.
4. ✅ **Join routing** (`3bf81ef`), as in "Join, step by step". Test
   helpers: `dialRoom(code)` adds `"local-"`, `dialKey(key)` sends it
   raw. Tests: malformed key → 4004; plain GET for `B-…` → 421 +
   `fly-replay: instance=B`.
4b. **Replay timeout + fallback** (decided s. 46, not built). Send
   `fly-replay: instance=<id>;timeout=5s;fallback=force_self`: if the
   target can't be reached in 5 s, Fly sends the request back to the
   replaying machine with a `fly-replay-failed: …;reason=…` request
   header. Fly's docs: a fallback request can't issue another
   `fly-replay`. So the handler needs a branch for that header (the user
   designs it: what to do and where in the order), ending in a 4004.
   Unknown: whether the fallback also fires for the proxy's "could not
   parse machine ID" 400 (probably not; accepted either way).
5. **Fly** (in progress). Done s. 46 on `popcorn-for-two-load`, 2
   machines: each logs its own ID; create + `curl` WebSocket handshake
   with `fly-force-instance-id: <other machine>` → `101`, logs show
   "Replaying room … to machine A" on B, then the join on A. Heartbeat
   closes the curl after ~30 s (it never pongs). Both "doesn't exist"
   cases tested (see edge cases). App destroyed after; recreate with
   `fly apps create popcorn-for-two-load`, then `fly deploy --config
   fly.load.toml --ha=false` + `fly scale count 2 --config
   fly.load.toml`. Still to do: re-test the destroyed-machine case
   after 4b.
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
   **Split on the last `-`** (decided s. 46): codes never contain one.
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
   **As built (s. 46):** "local" when `FLY_APP_NAME` is empty (not on
   Fly), and a startup `log.Fatal` if on Fly with no `FLY_MACHINE_ID`.
   Rejected again: a `LOCAL=true` flag that handlers could check (a
   dev-only branch, and a secret set by mistake on prod would make every
   machine `"local"`: silent 4004s, like the `LOAD_TEST` guard prevents).
4. ~~Per-IP create limit × n~~ **Accepted.** The limit stops one person
   grabbing every room; with creates spread by the load balancer, each
   machine still sees ~10 per IP, so per-machine protection is
   unchanged. Only the fleet total grows (2 machines). If it ever
   matters: a shared Redis counter (`INCR` + `EXPIRE` per create: one
   command per create, cheap). Rejected: route creates by IP hash
   (piles one IP on one machine, breaks with S3), split 10/n (needs n,
   uneven).
5. ~~Status code with `fly-replay`~~ **Decided s. 46:** 421 Misdirected
   Request. Fly's docs don't require one; 421 says what happened if the
   response ever leaks past (or runs without) the proxy.
6. ~~What the browser sees when the replay target doesn't exist~~
   **Answered s. 46** (edge cases table): junk ID → instant 400;
   destroyed machine → hang. Fix the hang in step 4b.
7. Step 4b: what the handler does with a `fly-replay-failed` request,
   and where that check goes in the order.
