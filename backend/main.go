package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"
)

const statusRoomNotFound websocket.StatusCode = 4004
const statusRoomFull websocket.StatusCode = 4005

var errRoomNotFound = errors.New("room not found")
var errRoomFull = errors.New("room full")

var rooms = map[string]map[*websocket.Conn]bool{}
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

	err = joinRoom(code, conn)
	if errors.Is(err, errRoomNotFound) {
		log.Println("Room not found:", code)
		conn.Close(statusRoomNotFound, "Room not found")
		return
	}
	if errors.Is(err, errRoomFull) {
		log.Println("Room is full:", code)
		conn.Close(statusRoomFull, "Room is full")
		return
	}
	if err != nil {
		log.Println("Error joining room:", err)
		conn.Close(websocket.StatusInternalError, "Internal error")
		return
	}
	log.Println("Client joined room:", code)
	defer leaveRoom(code, conn)

	for {
		typ, msg, err := conn.Read(r.Context())
		if err != nil {
			log.Println("Error reading message:", err)
			return
		}
		partner := getPartnerConn(code, conn)
		if partner == nil {
			continue
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		err = partner.Write(ctx, typ, msg)
		cancel()
		if err != nil {
			log.Println("Error writing message to partner:", err)
		}
	}
}

func main() {
	http.HandleFunc("GET /api/health", healthHandler)
	http.HandleFunc("POST /api/rooms", createRoomHandler)
	http.HandleFunc("GET /api/rooms/{code}/ws", joinRoomHandler)
	http.Handle("GET /", spaHandler("../frontend/dist"))
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
	rooms[roomCode] = map[*websocket.Conn]bool{}
	return roomCode
}

func joinRoom(code string, conn *websocket.Conn) error {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	_, ok := rooms[code]
	if !ok {
		return errRoomNotFound
	}
	if len(rooms[code]) > 1 {
		return errRoomFull
	}
	rooms[code][conn] = true
	return nil
}

func leaveRoom(code string, conn *websocket.Conn) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	delete(rooms[code], conn)
	log.Println("Client left room:", code)
}

func getPartnerConn(code string, conn *websocket.Conn) *websocket.Conn {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	for c := range rooms[code] {
		if c != conn {
			return c
		}
	}
	return nil
}

func spaHandler(dir string) http.Handler {
	files := http.Dir(dir)
	fileServer := http.FileServer(files)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, err := files.Open(r.URL.Path)
		if err != nil {
			http.ServeFile(w, r, dir+"/index.html")
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	})
}
