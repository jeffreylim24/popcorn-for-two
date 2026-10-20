package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func TestIsServerOnlyType(t *testing.T) {
	tests := []struct {
		typ  string
		want bool
	}{
		{"ice-servers", true},
		{"partner-joined", true},
		{"partner-present", true},
		{"partner-left", true},
		{"offer", false},
		{"video", false},
		{"", false},
	}
	for _, tt := range tests {
		got := isServerOnlyType(tt.typ)
		if got != tt.want {
			t.Errorf("isServerOnlyType(%q) = %v, want %v", tt.typ, got, tt.want)
		}
	}
}

// TestStringField_ReadsLikeTheBrowser checks the cases where a struct
// would disagree with the browser's JSON.parse: other casings and repeated
// keys. Each want is what the browser's msg.type would be.
func TestStringField_ReadsLikeTheBrowser(t *testing.T) {
	tests := []struct {
		msg    string
		want   string
		wantOK bool
	}{
		{`{"type":"offer"}`, "offer", true},
		{`{"type":"partner-left","Type":"offer"}`, "partner-left", true},
		{`{"Type":"partner-left","type":"offer"}`, "offer", true},
		{`{"type":"offer","type":"partner-left"}`, "partner-left", true},
		{`{"TYPE":"partner-left"}`, "", false},
		{`{"type":123}`, "", false},
		{`{"sdp":"x"}`, "", false},
	}
	for _, tt := range tests {
		fields, err := jsonFields([]byte(tt.msg))
		if err != nil {
			t.Fatalf("jsonFields(%s) error: %v", tt.msg, err)
		}
		got, ok := stringField(fields, "type")
		if got != tt.want || ok != tt.wantOK {
			t.Errorf("type of %s = %q, %v; want %q, %v", tt.msg, got, ok, tt.want, tt.wantOK)
		}
	}
}

func TestJSONFields_NotAnObject(t *testing.T) {
	for _, msg := range []string{`"offer"`, `[1,2]`, `not json`} {
		_, err := jsonFields([]byte(msg))
		if err == nil {
			t.Errorf("jsonFields(%s) = nil error, want an error", msg)
		}
	}
}

// fakeTURN is a stand-in for Cloudflare. calls counts how often the handler
// asked it; atomic because each connection's handler runs in its own
// goroutine.
type fakeTURN struct {
	calls atomic.Int32
}

func (f *fakeTURN) getICE(ctx context.Context) ([]map[string]any, error) {
	f.calls.Add(1)
	return []map[string]any{{"urls": "turn:fake.example"}}, nil
}

// startJoinServer runs the real join handler on a test server, behind the
// same route pattern as main, so r.PathValue("code") works.
// startJoinServer's limit is high enough that only the limit test, which
// passes its own, ever reaches it.
func startJoinServer(t *testing.T) (*httptest.Server, *fakeTURN) {
	return startJoinServerWithLimit(t, newLimiter(100, time.Hour))
}

// startJoinServerWithLimit is startJoinServer with a chosen TURN limit. All
// test clients come from 127.0.0.1, so they share one count.
func startJoinServerWithLimit(t *testing.T, turnLimit *limiter) (*httptest.Server, *fakeTURN) {
	return startJoinServerWith(t, turnLimit, slowHeartbeat)
}

// slowHeartbeat never fires during a test, so clients that stop reading
// keep their seats. Only the heartbeat test passes a fast one.
var slowHeartbeat = heartbeat{every: time.Hour, timeout: time.Hour}

// startJoinServerWith is startJoinServer with a chosen TURN limit and
// heartbeat.
func startJoinServerWith(t *testing.T, turnLimit *limiter, hb heartbeat) (*httptest.Server, *fakeTURN) {
	fake := &fakeTURN{}
	mux := http.NewServeMux()
	mux.Handle("GET /api/rooms/{code}/ws", joinRoomHandler(fake.getICE, turnLimit, hb))
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv, fake
}

// dialRoom opens a client WebSocket to the room. It is closed when the test
// ends.
func dialRoom(t *testing.T, srv *httptest.Server, code string) *websocket.Conn {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, srv.URL+"/api/rooms/"+code+"/ws", nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { conn.CloseNow() })
	return conn
}

// readFirst reads one message, giving up after 2 seconds so a broken
// handler fails the test instead of hanging it.
func readFirst(conn *websocket.Conn) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_, msg, err := conn.Read(ctx)
	return msg, err
}

// readICEServers reads the first message and fails the test unless it is
// ice-servers. Getting it also proves the server has seated this conn.
func readICEServers(t *testing.T, conn *websocket.Conn) iceServersMessage {
	msg, err := readFirst(conn)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var got iceServersMessage
	err = json.Unmarshal(msg, &got)
	if err != nil {
		t.Fatalf("unmarshal %s: %v", msg, err)
	}
	if got.Type != "ice-servers" {
		t.Fatalf("first message type = %q, want ice-servers", got.Type)
	}
	return got
}

func TestJoin_SeatHolderGetsICEServersFirst(t *testing.T) {
	srv, fake := startJoinServer(t)
	conn := dialRoom(t, srv, createRoom())

	got := readICEServers(t, conn)
	if len(got.IceServers) != 1 || got.IceServers[0]["urls"] != "turn:fake.example" {
		t.Errorf("iceServers = %v, want the fake's list", got.IceServers)
	}
	if n := fake.calls.Load(); n != 1 {
		t.Errorf("TURN calls = %d, want 1", n)
	}
}

// No seat → no credentials: the third person is refused before any
// message, and the TURN API is never asked on their behalf.
func TestJoin_FullRoomGetsNoCredentials(t *testing.T) {
	srv, fake := startJoinServer(t)
	code := createRoom()
	readICEServers(t, dialRoom(t, srv, code))
	readICEServers(t, dialRoom(t, srv, code))

	third := dialRoom(t, srv, code)
	msg, err := readFirst(third)
	if err == nil {
		t.Fatalf("third person got a message %s, want a close", msg)
	}
	if got := websocket.CloseStatus(err); got != statusRoomFull {
		t.Errorf("close status = %v, want %v", got, statusRoomFull)
	}
	if n := fake.calls.Load(); n != 2 {
		t.Errorf("TURN calls = %d, want 2 (one per seat)", n)
	}
}

func TestJoin_UnknownRoomGetsNoCredentials(t *testing.T) {
	srv, fake := startJoinServer(t)
	conn := dialRoom(t, srv, "nope00")

	msg, err := readFirst(conn)
	if err == nil {
		t.Fatalf("got a message %s, want a close", msg)
	}
	if got := websocket.CloseStatus(err); got != statusRoomNotFound {
		t.Errorf("close status = %v, want %v", got, statusRoomNotFound)
	}
	if n := fake.calls.Load(); n != 0 {
		t.Errorf("TURN calls = %d, want 0", n)
	}
}

// Over the limit: still seated, but ice-servers carries no list and the
// TURN API isn't asked.
func TestJoin_OverTURNLimitGetsNoList(t *testing.T) {
	srv, fake := startJoinServerWithLimit(t, newLimiter(1, time.Hour))
	code := createRoom()

	first := readICEServers(t, dialRoom(t, srv, code))
	if len(first.IceServers) == 0 {
		t.Errorf("first join got no list, want the fake's list")
	}
	second := readICEServers(t, dialRoom(t, srv, code))
	if second.IceServers != nil {
		t.Errorf("second join got %v, want no list", second.IceServers)
	}
	if n := fake.calls.Load(); n != 1 {
		t.Errorf("TURN calls = %d, want 1", n)
	}
}

// readUntil reads messages until one has type want, failing the test if
// the connection errors or a read takes over 2 seconds.
func readUntil(t *testing.T, conn *websocket.Conn, want string) {
	for {
		msg, err := readFirst(conn)
		if err != nil {
			t.Fatalf("waiting for %s: %v", want, err)
		}
		var got peekMessage
		err = json.Unmarshal(msg, &got)
		if err == nil && got.Type == want {
			return
		}
	}
}

// A client that stops answering pings (laptop asleep, Wi-Fi off) loses its
// seat: the partner hears partner-left, and someone new can take the seat.
func TestJoin_SilentClientLosesSeat(t *testing.T) {
	// The timeout is roomy because a also pauses reading while the test
	// dials; a short every keeps the test fast.
	hb := heartbeat{every: 20 * time.Millisecond, timeout: 200 * time.Millisecond}
	srv, _ := startJoinServerWith(t, newLimiter(100, time.Hour), hb)
	code := createRoom()

	a := dialRoom(t, srv, code)
	readICEServers(t, a)
	b := dialRoom(t, srv, code)
	readICEServers(t, b)
	// From here on b never calls Read. The Go client only answers pings
	// while reading, so b is now as silent as a dead network.

	readUntil(t, a, "partner-left")

	// The seat is really free: a newcomer is seated, not refused with
	// statusRoomFull, and a (who kept answering) is still in the room.
	readICEServers(t, dialRoom(t, srv, code))
	readUntil(t, a, "partner-joined")
}
