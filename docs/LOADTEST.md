# Load tests

How many couples the server holds at once, and how the numbers were
measured. The script is `loadtest/couples.js` ([k6](https://k6.io/)); the
README shows how to run it locally. `loadtest/rooms.js` is a small
separate check that the per-IP create limit lets only 10 rooms through.

**Summary:** one 256 MB Fly machine holds ~1250 couples before an
out-of-memory kill, so `maxRooms` caps it at **1000 per machine**.
Capacity grows in a straight line with machines (~1000 → ~2000 → ~4000
on 1, 2 and 4). Memory is the wall, not CPU or latency. Re-measure if
the VM size changes.

## One machine (#21, 2026-10-26)

`loadtest/couples.js` (k6): one VU = one couple for the whole run. It
creates a room, both partners join, and each sends a `sync` every 2 s
(the app's real rate) with a `sentAt` timestamp. 30 s ramp, 60 s hold.
The server runs with `LOAD_TEST=1` (fake TURN, per-IP limits off;
refused on the production app). Target: p95 relay under 100 ms, no lost
messages, every couple paired.

**Local, 2026-10-26.** A Mac with `GOMAXPROCS=1 GOMEMLIMIT=200MiB` (about
a Fly `shared-cpu-1x`, 256 MB), k6 on the same Mac:

| Couples | relay p95 | relay p99 | relay max | Live heap | Stacks | GC CPU | Process memory |
|---|---|---|---|---|---|---|---|
| 50 | 2 ms | n/a | 4 ms | | | | |
| 500 | 2 ms | n/a | 6 ms | | | | |
| 1000 | 2 ms | 3 ms | 11 ms | | | | |
| 2000 | 3 ms | 5 ms | 18 ms | 85 MB | 20 MB | 0% | 192 MB |
| 3000 | 7 ms | 11 ms | 62 ms | 127 MB | 31 MB | 16% | 244 MB |

Every run: 100% paired, 0 lost.

- **Memory is the wall, not CPU.** One core relays ~1600 msgs/s at 2000
  couples with flat latency. Memory grows in a straight line: about
  53 KB live (heap + stacks) and about 80 KB of process memory per couple.
- **At 3000 the GC thrashes**: the heap goal equals the live heap, so Go
  collects back to back, latency bends, and the process passes the soft
  limit. On Fly (~200 MB usable) that is likely an out-of-memory kill.
- Local estimate for the Fly VM was 2000–3000 couples. Fly measured
  lower (below): it missed the ~55 MB the VM uses before the server
  starts. `GOMEMLIMIT` is soft, so nothing crashes locally.

**Fly, 2026-10-26.** Server: a separate `popcorn-for-two-load` app
(`fly.load.toml`: production's VM, 256 MB `shared-cpu-1x`, plus
`LOAD_TEST=1`). k6 on a Fly machine in the same region (`yyz`, 2
performance CPUs, 4 GB) through the public URL, so Fly's proxy stays in
the path. Machine restarted before each run.

| Couples | Result | relay p95 / p99 | lost | dropped sockets | Memory |
|---|---|---|---|---|---|
| 1000 | ✓ | 4 / 6 ms | 0 | 0 | peak ~165 MB |
| 1250 | ✓ | 6 / 14 ms | 0 | 0 | peak ~197 MB of 207 |
| 1500 | ✗ | 14 / 51 ms | 5097 | 3000 of 3000 | out-of-memory kill |
| 2000 | ✗ | 38 ms before the kill | 6549 | 3643 | out-of-memory kill |
| 2000, `GOMEMLIMIT=180MiB` | ✗ | | | | out-of-memory kill |

- **Ceiling: ~1250 couples**, with almost no memory left; plan on
  ~1000. The VM has ~207 MB, ~55 MB of it used at idle (kernel, Fly's
  init, SSH), leaving ~150 MB for the server.
- **CPU and latency are never the limit:** p95 stays under 15 ms right up
  to the kill. A kill shows as `exit_code=137, oom_killed=true` in
  `fly machine status`, and every room is lost on the restart.
- **`GOMEMLIMIT` doesn't help here:** it only makes Go give back spare
  memory; at 2000 couples the live data alone doesn't fit. More capacity
  means a bigger VM (512 MB roughly doubles it).
- **Run k6 next to the server.** From a home laptop, 1000 couples
  "failed" (p95 6.67 s, sockets dropped by the heartbeat) because the
  home network / internet path choked; from a Fly machine in `yyz` the
  same run was 4 ms.
- Reproduce: `fly deploy --config fly.load.toml --ha=false`, then
  `fly machine run --app popcorn-for-two-k6 --region yyz --rm
  --vm-cpu-kind performance --vm-cpus 2 --vm-memory 4096 --file-local
  /scripts/couples.js=loadtest/couples.js --env BASE_URL=https://popcorn-for-two-load.fly.dev
  --env COUPLES=1250 grafana/k6:2.3.0 -- run -q --no-color /scripts/couples.js`.
  Destroy both apps afterwards.

## Several machines (#37)

Same script and VM as #21 (30 s ramp, 60 s hold, k6 on a Fly
performance-2x 4 GB machine in `yyz`), on the S1 code. Reports in
`loadtest/results/multiple-machines/s2/` (local only, gitignored).

| Run | Machines | Couples | Result | relay p95 / p99 | Peak memory per machine |
|---|---|---|---|---|---|
| 1 | 1 | 1000 | ✓ | 3 / 6 ms | 169 MB |
| 2 | 2 | 2000 | ✓ | 3 / 5 ms | 177, 169 MB |
| 3 | 2 | 2500, one k6 machine | ✓ (tail bends) | 62 / 268 ms | 201, 197 MB |
| 4 | 4 | 4000, **one** k6 machine | ✗ 53% paired | 975 ms / 1.95 s | 115–119 MB |
| 4b | 4 | 4000, **two** k6 machines × 2000 | ✓ | 5–6 / 46–51 ms | 201, 197, 170, 170 MB |
| 5 | 4 | 5001, three k6 × 1667 | ✓ | 2–7 / 4–47 ms | 202, 201, 200, 200 MB |
| 7 | 4 | 5202, three k6 × 1734 | ✗ 2 of 4 OOM-killed | 4–5 ms (survivors) | ~206 MB, then killed |
| cap | 1 | 1100, `maxRooms` 1000 | 1000 ✓ / 100 refused | 3 / 6 ms | 169 MB |

- **Capacity is linear in machines.** Server CPU stayed under 25%.
  The wall is ~1250–1300 couples per 256 MB machine: run 7 (1300)
  dropped 3928 sockets and lost 7438 messages after two OOM kills, while
  the survivors' p95 stayed ~5 ms. No latency warning before the cliff.
- **Run 3's bent tail was mostly k6, not the servers:** run 5 had the
  same 1250 per server and the same memory, but three k6 machines, and
  p99 was 4–47 ms instead of 268 ms. Keep each k6 machine at ≤ ~2000
  couples.
- **Run 4 failed in the test, not the app.** 474 creates got `EOF`
  (Fly's proxy hung up with no response), sockets took 2.5 s to open,
  while the servers sat at ~115 MB and 11% CPU and k6 at 67% CPU,
  2.2 GiB. The same load from two k6 machines passed. So one source
  (one k6 machine, maybe one IP) hit a limit; real couples come from
  many.
- **pair_time grows with machines** (p95 52 ms on 1 → 136–515 ms on 2–4):
  joins that land on the wrong machine take an extra replay hop. Once
  per join only.
- Debug tip: `save_k6`'s summary filter drops k6's warnings; count them
  with `perl -ne 'print "$1\n" if /error="((?:[^"\\]|\\.){0,200})/'`
  over `fly logs -a popcorn-for-two-k6 --no-tail -m <id>`. The log
  buffer keeps only recent lines.

