package main

import (
	"errors"
	"testing"
	"time"

	"github.com/coder/websocket"
)

// These tests share the package-level rooms map, so each one makes its own
// room with createRoom instead of reusing a code. The zero-value
// &websocket.Conn{} values never send anything: rooms.go only compares
// them by pointer, so they work as distinct stand-ins.

// newTestRoom makes a room, failing the test if the server is at its cap.
func newTestRoom(t *testing.T) string {
	code, err := createRoom()
	if err != nil {
		t.Fatalf("createRoom: %v", err)
	}
	return code
}

func TestJoinRoom_UnknownCodeRejected(t *testing.T) {
	conn := &websocket.Conn{}
	_, err := joinRoom("unknown", conn)
	if !errors.Is(err, errRoomNotFound) {
		t.Errorf("got: %v, want: %v", err, errRoomNotFound)
	}
}

func TestJoinRoom_TwoPeopleCanJoin(t *testing.T) {
	code := newTestRoom(t)
	conn1 := &websocket.Conn{}
	conn2 := &websocket.Conn{}
	_, err1 := joinRoom(code, conn1)
	_, err2 := joinRoom(code, conn2)
	if err1 != nil {
		t.Errorf("got: %v, want: nil", err1)
	}
	if err2 != nil {
		t.Errorf("got: %v, want: nil", err2)
	}
}

func TestJoinRoom_ReturnsWhoWasHereFirst(t *testing.T) {
	code := newTestRoom(t)
	conn1 := &websocket.Conn{}
	conn2 := &websocket.Conn{}
	partner1, err1 := joinRoom(code, conn1)
	partner2, err2 := joinRoom(code, conn2)
	if err1 != nil {
		t.Fatalf("got: %v, want: nil", err1)
	}
	if err2 != nil {
		t.Fatalf("got: %v, want: nil", err2)
	}
	if partner1 != nil {
		t.Errorf("first join: got: %v, want: nil", partner1)
	}
	if partner2 != conn1 {
		t.Errorf("second join: got: %v, want: %v", partner2, conn1)
	}
}

func TestJoinRoom_ThirdIsFull(t *testing.T) {
	code := newTestRoom(t)
	conn1 := &websocket.Conn{}
	conn2 := &websocket.Conn{}
	conn3 := &websocket.Conn{}
	_, err1 := joinRoom(code, conn1)
	_, err2 := joinRoom(code, conn2)
	_, err3 := joinRoom(code, conn3)
	if err1 != nil {
		t.Fatalf("got: %v, want: nil", err1)
	}
	if err2 != nil {
		t.Fatalf("got: %v, want: nil", err2)
	}
	if !errors.Is(err3, errRoomFull) {
		t.Errorf("got: %v, want: %v", err3, errRoomFull)
	}
}

func TestLeaveRoom_FreesSeat(t *testing.T) {
	code := newTestRoom(t)
	conn1 := &websocket.Conn{}
	conn2 := &websocket.Conn{}
	conn3 := &websocket.Conn{}
	_, err1 := joinRoom(code, conn1)
	_, err2 := joinRoom(code, conn2)
	if err1 != nil {
		t.Fatalf("got: %v, want: nil", err1)
	}
	if err2 != nil {
		t.Fatalf("got: %v, want: nil", err2)
	}
	leaveRoom(code, conn1)
	_, err3 := joinRoom(code, conn3)
	if err3 != nil {
		t.Errorf("got: %v, want: nil", err3)
	}
}

func TestLeaveRoom_ReturnsWhoStayed(t *testing.T) {
	code := newTestRoom(t)
	conn1 := &websocket.Conn{}
	conn2 := &websocket.Conn{}
	_, err1 := joinRoom(code, conn1)
	_, err2 := joinRoom(code, conn2)
	if err1 != nil {
		t.Fatalf("got: %v, want: nil", err1)
	}
	if err2 != nil {
		t.Fatalf("got: %v, want: nil", err2)
	}
	stayed := leaveRoom(code, conn2)
	if stayed != conn1 {
		t.Errorf("first leave: got: %v, want: %v", stayed, conn1)
	}
	stayed = leaveRoom(code, conn1)
	if stayed != nil {
		t.Errorf("last leave: got: %v, want: nil", stayed)
	}
}

func TestGetPartnerConn_AloneReturnsNil(t *testing.T) {
	code := newTestRoom(t)
	conn1 := &websocket.Conn{}
	_, err1 := joinRoom(code, conn1)
	if err1 != nil {
		t.Fatalf("got: %v, want: nil", err1)
	}
	partner := getPartnerConn(code, conn1)
	if partner != nil {
		t.Errorf("got: %v, want: nil", partner)
	}
}

func TestGetPartnerConn_TwoReturnsOther(t *testing.T) {
	code := newTestRoom(t)
	conn1 := &websocket.Conn{}
	conn2 := &websocket.Conn{}
	_, err1 := joinRoom(code, conn1)
	_, err2 := joinRoom(code, conn2)
	if err1 != nil {
		t.Fatalf("got: %v, want: nil", err1)
	}
	if err2 != nil {
		t.Fatalf("got: %v, want: nil", err2)
	}
	partner1 := getPartnerConn(code, conn1)
	partner2 := getPartnerConn(code, conn2)
	if partner1 != conn2 {
		t.Errorf("got: %v, want: %v", partner1, conn2)
	}
	if partner2 != conn1 {
		t.Errorf("got: %v, want: %v", partner2, conn1)
	}
}

func TestIsValidVideoID(t *testing.T) {
	tests := []struct {
		id   string
		want bool
	}{
		{"dQw4w9WgXcQ", true},
		{"dQw4-_WgXcQ", true},
		{"dQw4w9WgXc", false},
		{"dQw4w9WgXcQQ", false},
		{"dQw4w9 gXcQ", false},
		{"", false},
	}
	for _, tt := range tests {
		got := isValidVideoID(tt.id)
		if got != tt.want {
			t.Errorf("isValidVideoID(%q) = %v, want %v", tt.id, got, tt.want)
		}
	}
}

// TestSetRoomVideo also reads back with getRoomVideo, to check that a
// rejected ID leaves the room's video unchanged.
func TestSetRoomVideo(t *testing.T) {
	tests := []struct {
		roomExists bool
		videoID    string
		wantErr    error
		wantVideo  string
	}{
		{true, "dQw4w9WgXcQ", nil, "dQw4w9WgXcQ"},
		{true, "invalidID", errInvalidVideoID, ""},
		{false, "dQw4w9WgXcQ", errRoomNotFound, ""},
	}
	for _, tt := range tests {
		c := newTestRoom(t)
		if !tt.roomExists {
			// A code createRoom never returns: 15 characters, not 6.
			c = "invalidRoomCode"
		}
		err := setRoomVideo(c, tt.videoID)
		if !errors.Is(err, tt.wantErr) {
			t.Errorf("setRoomVideo(%q, %q) = %v, want %v", c, tt.videoID, err, tt.wantErr)
		}
		if got := getRoomVideo(c); got != tt.wantVideo {
			t.Errorf("getRoomVideo(%q) = %q, want %q", c, got, tt.wantVideo)
		}
	}
}

// The sweep tests pass a fake "now", so they never wait for real time.

// A room nobody ever joined (what a spam script makes) has no leave event
// to trigger deletion, so the sweep alone must remove it.
func TestSweepRooms_DeletesNeverJoinedRoom(t *testing.T) {
	code := newTestRoom(t)
	sweepRooms(time.Now().Add(roomIdleTTL+time.Second), roomIdleTTL)
	_, err := joinRoom(code, &websocket.Conn{})
	if !errors.Is(err, errRoomNotFound) {
		t.Errorf("got: %v, want: %v", err, errRoomNotFound)
	}
}

func TestSweepRooms_KeepsRoomWithinGracePeriod(t *testing.T) {
	code := newTestRoom(t)
	sweepRooms(time.Now().Add(roomIdleTTL-time.Second), roomIdleTTL)
	_, err := joinRoom(code, &websocket.Conn{})
	if err != nil {
		t.Errorf("got: %v, want: nil", err)
	}
}

func TestSweepRooms_KeepsOccupiedRoom(t *testing.T) {
	code := newTestRoom(t)
	_, err := joinRoom(code, &websocket.Conn{})
	if err != nil {
		t.Fatalf("got: %v, want: nil", err)
	}
	// Far in the future: still kept, because someone is in it.
	sweepRooms(time.Now().Add(100*roomIdleTTL), roomIdleTTL)
	_, err = joinRoom(code, &websocket.Conn{})
	if err != nil {
		t.Errorf("got: %v, want: nil", err)
	}
}

// The last person leaving starts the clock, so a room that just emptied
// is still there for a refresh.
func TestSweepRooms_KeepsJustEmptiedRoom(t *testing.T) {
	code := newTestRoom(t)
	conn := &websocket.Conn{}
	_, err := joinRoom(code, conn)
	if err != nil {
		t.Fatalf("got: %v, want: nil", err)
	}
	leaveRoom(code, conn)

	sweepRooms(time.Now(), roomIdleTTL)
	_, err = joinRoom(code, &websocket.Conn{})
	if err != nil {
		t.Errorf("got: %v, want: nil", err)
	}
}

func TestSweepRooms_EmptiedRoomIsDeleted(t *testing.T) {
	code := newTestRoom(t)
	conn := &websocket.Conn{}
	_, err := joinRoom(code, conn)
	if err != nil {
		t.Fatalf("got: %v, want: nil", err)
	}
	leaveRoom(code, conn)

	sweepRooms(time.Now().Add(roomIdleTTL+time.Second), roomIdleTTL)
	_, err = joinRoom(code, &websocket.Conn{})
	if !errors.Is(err, errRoomNotFound) {
		t.Errorf("got: %v, want: %v", err, errRoomNotFound)
	}
}

// A refresh: the only person leaves and comes back inside the grace
// period. Their join must stop the clock for good.
func TestSweepRooms_RejoinStopsTheClock(t *testing.T) {
	code := newTestRoom(t)
	conn := &websocket.Conn{}
	joinRoom(code, conn)
	leaveRoom(code, conn)
	joinRoom(code, &websocket.Conn{})

	sweepRooms(time.Now().Add(roomIdleTTL+time.Second), roomIdleTTL)
	_, err := joinRoom(code, &websocket.Conn{})
	if err != nil {
		t.Errorf("got: %v, want: nil", err)
	}
}

func TestCreateRoom_RefusesAtCap(t *testing.T) {
	roomsMutex.Lock()
	old := maxRooms
	maxRooms = len(rooms)
	roomsMutex.Unlock()
	t.Cleanup(func() {
		roomsMutex.Lock()
		maxRooms = old
		roomsMutex.Unlock()
	})

	_, err := createRoom()
	if !errors.Is(err, errTooManyRooms) {
		t.Errorf("got: %v, want: %v", err, errTooManyRooms)
	}
}
