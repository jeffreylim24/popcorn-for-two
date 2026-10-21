// Command backend is the Popcorn for Two server. It creates rooms, relays
// WebSocket messages between the two people in each room (video sync and
// WebRTC call signalling), sends each person short-lived TURN credentials
// when they join, and serves the built frontend.
//
// It refuses to start unless TURN_KEY_ID and TURN_KEY_API are set. Rooms
// live in memory, so it must run as a single instance.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	turnKeyID := os.Getenv("TURN_KEY_ID")
	turnKeyAPI := os.Getenv("TURN_KEY_API")

	// Fail at startup, not on the first call: a missing key would
	// otherwise only show up as broken calls.
	if turnKeyID == "" || turnKeyAPI == "" {
		log.Fatal("TURN_KEY_ID and TURN_KEY_API must be set in the environment variables")
	}

	// The keys stay in this closure; the handler only sees "get a list".
	getICE := func(ctx context.Context) ([]map[string]any, error) {
		return getICEServers(ctx, turnKeyID, turnKeyAPI)
	}

	revokeICE := func(ctx context.Context, username string) error {
		return revokeTURNCredential(ctx, turnKeyID, turnKeyAPI, username)
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
