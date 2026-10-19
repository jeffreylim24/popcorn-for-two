package main

import (
	"errors"
	"testing"

	"github.com/coder/websocket"
)

// These tests share the package-level rooms map, so each one makes its own
// room with createRoom instead of reusing a code. The zero-value
// &websocket.Conn{} values never send anything: rooms.go only compares
// them by pointer, so they work as distinct stand-ins.

func TestJoinRoom_UnknownCodeRejected(t *testing.T) {
	conn := &websocket.Conn{}
	_, err := joinRoom("unknown", conn)
	if !errors.Is(err, errRoomNotFound) {
		t.Errorf("got: %v, want: %v", err, errRoomNotFound)
	}
}

func TestJoinRoom_TwoPeopleCanJoin(t *testing.T) {
	code := createRoom()
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
	code := createRoom()
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
	code := createRoom()
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
	code := createRoom()
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
	code := createRoom()
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
	code := createRoom()
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
	code := createRoom()
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
		c := createRoom()
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
