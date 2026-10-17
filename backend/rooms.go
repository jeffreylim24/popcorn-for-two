package main

import (
	"errors"
	"log"
	"math/rand/v2"
	"sync"

	"github.com/coder/websocket"
)

type room struct {
	conns   map[*websocket.Conn]bool
	videoID string
}

const statusRoomNotFound websocket.StatusCode = 4004
const statusRoomFull websocket.StatusCode = 4005

var errRoomNotFound = errors.New("room not found")
var errRoomFull = errors.New("room full")

var rooms = map[string]*room{}
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
	rooms[roomCode] = &room{
		conns:   map[*websocket.Conn]bool{},
		videoID: "",
	}
	return roomCode
}

func joinRoom(code string, conn *websocket.Conn) error {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	_, ok := rooms[code]
	if !ok {
		return errRoomNotFound
	}
	if len(rooms[code].conns) > 1 {
		return errRoomFull
	}
	rooms[code].conns[conn] = true
	return nil
}

func leaveRoom(code string, conn *websocket.Conn) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	r, ok := rooms[code]
	if !ok {
		return
	}
	delete(r.conns, conn)
	log.Println("Client left room:", code)
}

func getPartnerConn(code string, conn *websocket.Conn) *websocket.Conn {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	r, ok := rooms[code]
	if !ok {
		return nil
	}
	for c := range r.conns {
		if c != conn {
			return c
		}
	}
	return nil
}
