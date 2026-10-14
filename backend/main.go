package main

import (
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"sync"

	"github.com/coder/websocket"
)

const statusRoomNotFound websocket.StatusCode = 4004

var rooms = map[string]bool{}
var roomsMutex sync.Mutex

func healthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Health check: OK")
}

func createRoomHandler(w http.ResponseWriter, r *http.Request) {
	roomCode := createRoom()
	fmt.Fprint(w, roomCode)
}

func joinRoomHandler(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		log.Println("Failed to accept websocket connection:", err)
		return
	}
	defer conn.CloseNow()

	if !roomExists(code) {
		log.Println("Room does not exist:", code)
		conn.Close(statusRoomNotFound, "Room not found")
		return
	}

	log.Println("Client joined room:", code)
	for {
		_, msg, err := conn.Read(r.Context())
		if err != nil {
			log.Println("Error reading message:", err)
			return
		}
		log.Println("Received message:", string(msg))
	}
}

func main() {
	http.HandleFunc("GET /api/health", healthHandler)
	http.HandleFunc("POST /api/rooms", createRoomHandler)
	http.HandleFunc("GET /api/rooms/{code}/ws", joinRoomHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func generateRoomCode() string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	var code string
	for range 6 {
		code += string(letters[rand.IntN(len(letters))])
	}
	return code
}

func createRoom() string {
	roomCode := generateRoomCode()
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	_, ok := rooms[roomCode]
	for ok {
		roomCode = generateRoomCode()
		_, ok = rooms[roomCode]
	}
	rooms[roomCode] = true
	return roomCode
}

func roomExists(code string) bool {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	_, ok := rooms[code]
	return ok
}
