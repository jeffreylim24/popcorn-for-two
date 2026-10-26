// Command backend is the Popcorn for Two server. It creates rooms, relays
// WebSocket messages between the two people in each room (video sync and
// WebRTC call signalling), sends each person short-lived TURN credentials
// when they join, and serves the built frontend.
//
// It refuses to start unless TURN_KEY_ID and TURN_KEY_API are set. Rooms
// live in memory, so it must run as a single instance.
//
// LOAD_TEST=1 starts it in load-test mode (see loadTestMode): no TURN keys
// needed, a fake STUN-only list instead of Cloudflare, and per-IP limits
// that never say no, so one machine running k6 can act as many couples.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"time"
)

// prodAppName is the Fly app that real couples use. Fly sets FLY_APP_NAME
// on every machine, so load-test mode can tell it is on production.
const prodAppName = "popcorn-for-two"

// loadTestIPLimit stands in for the per-IP limits in load-test mode: high
// enough that a test never reaches it, while the limiter code still runs
// and its cost still shows up in the results.
const loadTestIPLimit = 1_000_000

// loadTestMode reports whether loadTest (the LOAD_TEST env var) asks for
// load-test mode. It refuses on the production app, so a secret set by
// mistake can't switch off production's limits or its TURN relay.
func loadTestMode(loadTest, flyAppName string) (bool, error) {
	if loadTest != "1" {
		return false, nil
	}
	if flyAppName == prodAppName {
		return false, errors.New("LOAD_TEST=1 is not allowed on the production app")
	}
	return true, nil
}

func main() {
	loadTest, err := loadTestMode(os.Getenv("LOAD_TEST"), os.Getenv("FLY_APP_NAME"))
	if err != nil {
		log.Fatal(err)
	}

	// 30 credential fetches per IP per 10 minutes: room for reloads (each
	// one is a new join) and two-tab testing from one IP, and still stops
	// one client flooding Cloudflare's API (which would cut TURN off for
	// every couple). It doesn't cap relay bandwidth: one credential works
	// for its whole TTL.
	turnLimit := newLimiter(30, 10*time.Minute)

	// 10 new rooms per IP per 10 minutes: a couple makes one per date
	// night, so this only stops a script. Rooms nobody joins are deleted by
	// the sweeper below.
	createLimit := newLimiter(10, 10*time.Minute)

	var getICE iceServersFunc
	var revokeICE revokeFunc
	if loadTest {
		log.Println("LOAD TEST MODE: fake TURN, per-IP limits off")
		turnLimit = newLimiter(loadTestIPLimit, 10*time.Minute)
		createLimit = newLimiter(loadTestIPLimit, 10*time.Minute)
		// STUN only: no username, so revoke is never called either.
		getICE = func(ctx context.Context) ([]map[string]any, error) {
			return []map[string]any{{"urls": "stun:stun.l.google.com:19302"}}, nil
		}
		revokeICE = func(ctx context.Context, username string) error {
			return nil
		}
	} else {
		turnKeyID := os.Getenv("TURN_KEY_ID")
		turnKeyAPI := os.Getenv("TURN_KEY_API")

		// Fail at startup, not on the first call: a missing key would
		// otherwise only show up as broken calls.
		if turnKeyID == "" || turnKeyAPI == "" {
			log.Fatal("TURN_KEY_ID and TURN_KEY_API must be set in the environment variables")
		}

		// The keys stay in this closure; the handler only sees "get a list".
		getICE = func(ctx context.Context) ([]map[string]any, error) {
			return getICEServers(ctx, turnKeyID, turnKeyAPI)
		}

		revokeICE = func(ctx context.Context, username string) error {
			return revokeTURNCredential(ctx, turnKeyID, turnKeyAPI, username)
		}
	}

	go sweepRoomsEvery(context.Background(), time.Minute, roomIdleTTL)

	// Ping every 15 s, wait up to 15 s for the pong: a dead connection
	// loses its seat within ~30 s. The wait must stay well above the relay
	// loop's 5 s write timeout, since pongs are only read between writes.
	hb := heartbeat{every: 15 * time.Second, timeout: 15 * time.Second}

	http.HandleFunc("GET /api/health", healthHandler)
	http.Handle("POST /api/rooms", createRoomHandler(createLimit))
	http.Handle("GET /api/rooms/{code}/ws", joinRoomHandler(getICE, revokeICE, turnLimit, hb))
	// "GET /" is the catch-all: the more specific /api/ patterns win. The
	// path is relative to the working directory, which is backend/ both in
	// dev and in the Docker image.
	http.Handle("GET /", spaHandler("../frontend/dist"))
	log.Fatal(http.ListenAndServe(":8080", nil))
}
