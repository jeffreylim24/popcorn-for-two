package main

import (
	"context"
	"errors"
	"log"
	"math/rand/v2"
	"regexp"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// A room is one couple's shared space: at most two connections and the
// video they are watching. Its fields are guarded by roomsMutex.
type room struct {
	// conns is used as a set: only the keys matter.
	conns map[*websocket.Conn]bool
	// videoID is the current YouTube video, or "" if none is picked yet.
	// It is sent to whoever joins so they load the same video.
	videoID string
	// emptySince is when the room last had nobody in it: its creation, or
	// the last seat leaving. It is the zero time while someone is in.
	emptySince time.Time
}

// WebSocket close codes sent when a join is refused. Codes 4000-4999 are
// free for applications to use; the frontend matches on these numbers.
const statusRoomNotFound websocket.StatusCode = 4004
const statusRoomFull websocket.StatusCode = 4005

// Sentinel errors, compared with errors.Is so callers can react to each case.
var errRoomNotFound = errors.New("room not found")
var errRoomFull = errors.New("room full")
var errInvalidVideoID = errors.New("invalid video ID")
var errTooManyRooms = errors.New("too many rooms")

// roomIdleTTL is how long a room may sit empty before the sweeper deletes
// it. It is long enough for a refresh, a flaky connection, or a partner
// who is late to the call.
const roomIdleTTL = 10 * time.Minute

// maxRooms caps how many rooms exist at once. The per-IP limit can't stop
// an attacker with many IPs; this keeps memory bounded whatever they do.
// It is a var so a test can lower it.
var maxRooms = 5000

// rooms maps a room code to its room. Every handler runs in its own
// goroutine, so any read or write of rooms, or of a room's fields, must
// hold roomsMutex.
var rooms = map[string]*room{}
var roomsMutex sync.Mutex

// videoIDPattern matches a YouTube video ID: exactly 11 letters, digits,
// '-' or '_'. Checking it stops a client storing arbitrary text that the
// other browser would then load.
var videoIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{11}$`)

// generateRoomCode returns a random 6-character alphanumeric code. It does
// not check for collisions; createRoom does.
func generateRoomCode() string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	var code string
	for range 6 {
		code += string(letters[rand.IntN(len(letters))])
	}
	return code
}

// createRoom makes an empty room under a fresh, unused code and returns
// the code, or errTooManyRooms if maxRooms rooms already exist. The cap
// check, the uniqueness check and the insert share one lock, so two rooms
// can't be given the same code or slip past the cap together.
func createRoom() (string, error) {
	roomCode := generateRoomCode()
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	if len(rooms) >= maxRooms {
		return "", errTooManyRooms
	}
	_, ok := rooms[roomCode]
	for ok {
		roomCode = generateRoomCode()
		_, ok = rooms[roomCode]
	}
	rooms[roomCode] = &room{
		conns:      map[*websocket.Conn]bool{},
		videoID:    "",
		emptySince: time.Now(),
	}
	return roomCode, nil
}

// joinRoom adds conn to the room and returns whoever was already in it
// (nil if the room was empty). It returns errRoomNotFound for an unknown
// code and errRoomFull if two people are already in. Both steps happen
// under one lock, so two people joining at once can't both see the other
// as "already here".
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
	r.emptySince = time.Time{} // zero time means "not empty"
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
	if len(r.conns) == 0 {
		r.emptySince = time.Now()
	}
	var partner *websocket.Conn
	for c := range r.conns {
		partner = c
	}
	return partner
}

// sweepRooms deletes every room that has been empty for longer than ttl as
// of now, and returns how many it deleted. The check and the delete share
// one lock with joinRoom, so a room is either swept before a join (the
// joiner gets errRoomNotFound) or has someone in it and is kept; never both.
func sweepRooms(now time.Time, ttl time.Duration) int {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	deleted := 0
	for code, r := range rooms {
		if len(r.conns) == 0 && now.Sub(r.emptySince) > ttl {
			delete(rooms, code)
			deleted++
		}
	}
	return deleted
}

// sweepRoomsEvery runs sweepRooms every interval until ctx ends. Rooms that
// were never joined never trigger a leave, so they are only ever freed here.
func sweepRoomsEvery(ctx context.Context, interval, ttl time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if n := sweepRooms(time.Now(), ttl); n > 0 {
				log.Println("Swept empty rooms:", n)
			}
		}
	}
}

// getPartnerConn returns the other connection in the room, or nil if conn
// is alone or the room doesn't exist.
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

// isValidVideoID reports whether id looks like a YouTube video ID.
func isValidVideoID(id string) bool {
	return videoIDPattern.MatchString(id)
}

// setRoomVideo records videoID as the room's current video. It returns
// errRoomNotFound or errInvalidVideoID and leaves the room unchanged on
// either.
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

// getRoomVideo returns the room's current video ID, or "" if none is set
// or the room doesn't exist.
func getRoomVideo(code string) string {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	r, ok := rooms[code]
	if !ok {
		return ""
	}
	return r.videoID
}
