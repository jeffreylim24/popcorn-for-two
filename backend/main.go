// Command backend is the Popcorn for Two server. It creates rooms, relays
// WebSocket messages between the two people in each room (video sync and
// WebRTC call signalling), hands out short-lived TURN credentials, and
// serves the built frontend.
//
// It refuses to start unless TURN_KEY_ID and TURN_KEY_API are set. Rooms
// live in memory, so it must run as a single instance.
package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	turnKeyID := os.Getenv("TURN_KEY_ID")
	turnKeyAPI := os.Getenv("TURN_KEY_API")

	// Fail at startup, not on the first call: a missing key would
	// otherwise only show up as broken calls.
	if turnKeyID == "" || turnKeyAPI == "" {
		log.Fatal("TURN_KEY_ID and TURN_KEY_API must be set in the environment variables")
	}

	http.HandleFunc("GET /api/health", healthHandler)
	http.HandleFunc("POST /api/rooms", createRoomHandler)
	http.HandleFunc("GET /api/rooms/{code}/ws", joinRoomHandler)
	// "GET /" is the catch-all: the more specific /api/ patterns win. The
	// path is relative to the working directory, which is backend/ both in
	// dev and in the Docker image.
	http.Handle("GET /", spaHandler("../frontend/dist"))
	http.Handle("GET /api/ice-servers", iceServersHandler(turnKeyID, turnKeyAPI))
	log.Fatal(http.ListenAndServe(":8080", nil))
}
