import http from 'k6/http'
import { check, sleep } from 'k6'
import exec from 'k6/execution'
import { WebSocket } from 'k6/websockets'
import { Counter, Rate, Trend } from 'k6/metrics'

/** Server to test. Never production: start it with LOAD_TEST=1. */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080'
const WS_URL = BASE_URL.replace(/^http/, 'ws')

/** How many couples (rooms with two sockets) to reach. */
const COUPLES = Number(__ENV.COUPLES || 50)
/** Seconds to spread the couples' arrival over, so the load ramps up. */
const RAMP_S = Number(__ENV.RAMP_S || 30)
/** Seconds every couple stays once the last one has arrived. */
const HOLD_S = Number(__ENV.HOLD_S || 60)

/** Same as the app: each playing tab sends its position every 2 s. */
const SYNC_INTERVAL_MS = 2000
/** A couple that isn't paired by then counts as a failed join. */
const PAIR_TIMEOUT_MS = 10_000
/** Time after the last send for messages still in flight to land. */
const GRACE_MS = 3000

/** Time from one partner sending a message to the other receiving it. */
const relayLatency = new Trend('relay_latency', true)
/** Time from creating the room to both partners being in it. */
const pairTime = new Trend('pair_time', true)
/** Messages sent but never received, added once per couple at the end. */
const relayLost = new Counter('relay_lost')
/** Share of couples that got both partners into their room. */
const paired = new Rate('paired')
/** Sockets the server closed before the couple was done. */
const droppedSockets = new Counter('dropped_sockets')

// One VU = one couple, for the whole test. A ramping executor would start
// a new couple (and a new room) each time one finishes; rooms linger for
// 10 minutes, so that would measure room churn instead of live rooms.
export const options = {
  scenarios: {
    couples: {
      executor: 'per-vu-iterations',
      vus: COUPLES,
      iterations: 1,
      maxDuration: `${RAMP_S + HOLD_S + 60}s`,
    },
  },
  // k6's default summary stops at p(95); p(99) shows the slow tail first.
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    relay_latency: ['p(95)<100'],
    relay_lost: ['count==0'],
    paired: ['rate==1'],
  },
}

export default function () {
  // Stagger arrivals: VU n arrives at n/COUPLES of the way through the ramp.
  sleep(((exec.vu.idInTest - 1) / COUPLES) * RAMP_S)
  // Every couple leaves together, when the hold ends.
  const endAt = exec.scenario.startTime + (RAMP_S + HOLD_S) * 1000

  const res = http.post(`${BASE_URL}/api/rooms`, null)
  if (!check(res, { 'room created': (r) => r.status === 200 })) {
    paired.add(false)
    return
  }
  const roomURL = `${WS_URL}/api/rooms/${res.body}/ws`
  const createdAt = Date.now()

  let sent = 0
  let received = 0
  let isPaired = false
  let ending = false
  const intervals = []

  /** Counts and times our own sync messages; the server's notices are ignored. */
  const onMessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.type === 'sync' && typeof msg.sentAt === 'number') {
      received++
      relayLatency.add(Date.now() - msg.sentAt)
    }
  }

  /** A server-side close before we hang up means the server dropped us. */
  const onClose = () => {
    if (!ending) droppedSockets.add(1)
  }

  /** Sends a real-shaped sync message, plus when it left. */
  const startSending = (socket) => {
    let position = 0
    intervals.push(
      setInterval(() => {
        position += SYNC_INTERVAL_MS / 1000
        socket.send(JSON.stringify({ type: 'sync', position, state: 'playing', sentAt: Date.now() }))
        sent++
      }, SYNC_INTERVAL_MS),
    )
  }

  /** Hangs up both partners and records what got lost. */
  const finish = () => {
    ending = true
    relayLost.add(sent - received)
    a.close()
    b.close()
  }

  // A joins first; B joins once A is in. The server then tells A
  // "partner-joined", which means both seats are filled.
  const a = new WebSocket(roomURL)
  let b

  a.addEventListener('open', () => {
    b = new WebSocket(roomURL)
    b.addEventListener('message', onMessage)
    b.addEventListener('close', onClose)
  })
  a.addEventListener('message', (e) => {
    if (!isPaired && JSON.parse(e.data).type === 'partner-joined') {
      isPaired = true
      paired.add(true)
      pairTime.add(Date.now() - createdAt)
      startSending(a)
      startSending(b)

      // Stop sending at endAt, then wait for in-flight messages.
      setTimeout(
        () => {
          intervals.forEach(clearInterval)
          setTimeout(finish, GRACE_MS)
        },
        Math.max(0, endAt - Date.now()),
      )
      return
    }
    onMessage(e)
  })
  a.addEventListener('close', onClose)

  setTimeout(() => {
    if (isPaired) return
    paired.add(false)
    ending = true
    a.close()
    if (b) b.close()
  }, PAIR_TIMEOUT_MS)
}
