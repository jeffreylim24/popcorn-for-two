package main

import (
	"errors"
	"log"
	"math/rand/v2"
	"sync"

	"github.com/coder/websocket"
)

const statusRoomNotFound websocket.StatusCode = 4004
const statusRoomFull websocket.StatusCode = 4005

var errRoomNotFound = errors.New("room not found")
var errRoomFull = errors.New("room full")

var rooms = map[string]map[*websocket.Conn]bool{}
var roomsMutex sync.Mutex

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
