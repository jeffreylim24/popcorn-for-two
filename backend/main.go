package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	turnKeyID := os.Getenv("TURN_KEY_ID")
	turnKeyAPI := os.Getenv("TURN_KEY_API")

	if turnKeyID == "" || turnKeyAPI == "" {
		log.Fatal("TURN_KEY_ID and TURN_KEY_API must be set in the environment variables")
	}

	http.HandleFunc("GET /api/health", healthHandler)
	http.HandleFunc("POST /api/rooms", createRoomHandler)
	http.HandleFunc("GET /api/rooms/{code}/ws", joinRoomHandler)
	http.Handle("GET /", spaHandler("../frontend/dist"))
	http.Handle("GET /api/ice-servers", iceServersHandler(turnKeyID, turnKeyAPI))
	log.Fatal(http.ListenAndServe(":8080", nil))
}
