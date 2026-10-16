package main

import (
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("GET /api/health", healthHandler)
	http.HandleFunc("POST /api/rooms", createRoomHandler)
	http.HandleFunc("GET /api/rooms/{code}/ws", joinRoomHandler)
	http.Handle("GET /", spaHandler("../frontend/dist"))
	log.Fatal(http.ListenAndServe(":8080", nil))
}
