package main

import (
	"errors"
	"log"
	"math/rand/v2"
	"regexp"
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
var errInvalidVideoID = errors.New("invalid video ID")

var rooms = map[string]*room{}
var roomsMutex sync.Mutex

var videoIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{11}$`)

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

// joinRoom adds conn to the room and returns whoever was already in it
// (nil if the room was empty). Both happen under one lock, so two
// people joining at once can't both see the other as "already here".
func joinRoom(code string, conn *websocket.Conn) (*websocket.Conn, error) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	r, ok := rooms[code]
	if !ok {
		return nil, errRoomNotFound
	}
	if len(r.conns) > 1 {
		return nil, errRoomFull
	}
	var partner *websocket.Conn
	for c := range r.conns {
		partner = c
	}
	r.conns[conn] = true
	return partner, nil
}

// leaveRoom removes conn from the room and returns whoever is still in it
// (nil if the room is now empty). Both happen under one lock, so someone
// joining in between can't be mistaken for the partner who stayed.
func leaveRoom(code string, conn *websocket.Conn) *websocket.Conn {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	r, ok := rooms[code]
	if !ok {
		return nil
	}
	delete(r.conns, conn)
	log.Println("Client left room:", code)
	var partner *websocket.Conn
	for c := range r.conns {
		partner = c
	}
	return partner
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

func isValidVideoID(id string) bool {
	return videoIDPattern.MatchString(id)
}

func setRoomVideo(code, videoID string) error {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	r, ok := rooms[code]
	if !ok {
		return errRoomNotFound
	}
	if !isValidVideoID(videoID) {
		return errInvalidVideoID
	}
	r.videoID = videoID
	return nil
}

func getRoomVideo(code string) string {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	r, ok := rooms[code]
	if !ok {
		return ""
	}
	return r.videoID
}
