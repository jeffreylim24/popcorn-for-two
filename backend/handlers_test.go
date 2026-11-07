package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
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
	// revoked receives the username of every revoke the handler asks for,
	// so a test can wait for one instead of sleeping.
	revoked chan string
	// failRevoke makes revoke return an error; block makes it wait for
	// release to be closed. Both are atomic because the handler's goroutine
	// reads them.
	failRevoke atomic.Bool
	block      atomic.Bool
	release    chan struct{}
}

// getICE hands out a different username per call, so a test can tell the
// seats apart.
func (f *fakeTURN) getICE(ctx context.Context) ([]map[string]any, error) {
	n := f.calls.Add(1)
	return []map[string]any{{
		"urls":       "turn:fake.example",
		"username":   fmt.Sprintf("user-%d", n),
		"credential": "secret",
	}}, nil
}

func (f *fakeTURN) revoke(ctx context.Context, username string) error {
	f.revoked <- username
	if f.block.Load() {
		<-f.release
	}
	if f.failRevoke.Load() {
		return errors.New("fake revoke failure")
	}
	return nil
}

// startJoinServer runs the real join handler on a test server, behind the
// same route pattern as main, so r.PathValue("key") works.
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
	fake := &fakeTURN{revoked: make(chan string, 10), release: make(chan struct{})}
	// Unblocks a revoke a test left waiting, so no goroutine outlives it.
	t.Cleanup(func() { close(fake.release) })
	mux := http.NewServeMux()
	mux.Handle("GET /api/rooms/{key}/ws", joinRoomHandler(fake.getICE, fake.revoke, turnLimit, hb, testMachineID))
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv, fake
}

// testMachineID is the machine the join test server pretends to be.
const testMachineID = "local"

// dialRoom opens a client WebSocket to the room stored under code on the
// test server's machine. It is closed when the test ends.
func dialRoom(t *testing.T, srv *httptest.Server, code string) *websocket.Conn {
	return dialKey(t, srv, testMachineID+"-"+code)
}

// dialKey is dialRoom with the full room key as sent in the URL, so a test
// can send a malformed one.
func dialKey(t *testing.T, srv *httptest.Server, key string) *websocket.Conn {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, srv.URL+"/api/rooms/"+key+"/ws", nil)
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
	conn := dialRoom(t, srv, newTestRoom(t))

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
	code := newTestRoom(t)
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

// A key that doesn't parse (here an old link with a bare 6-char code) is
// "room not found": the browser can only read a reason from a close code,
// so the handler upgrades and then closes.
func TestJoin_MalformedKeyIsNotFound(t *testing.T) {
	srv, fake := startJoinServer(t)
	conn := dialKey(t, srv, "xY3kQ9")

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

// A room on another machine gets a fly-replay to that machine and no
// upgrade: after a 101, Fly's proxy could no longer resend the request.
func TestJoin_OtherMachineIsReplayed(t *testing.T) {
	srv, _ := startJoinServer(t)
	resp, err := http.Get(srv.URL + "/api/rooms/B-xY3kQ9/ws")
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusMisdirectedRequest {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusMisdirectedRequest)
	}
	want := "instance=B;timeout=5s;fallback=force_self"
	if got := resp.Header.Get("fly-replay"); got != want {
		t.Errorf("fly-replay = %q, want %q", got, want)
	}
}

// A replay Fly sent back (fly-replay-failed) must not replay again: it gets
// a 503, no fly-replay header and no upgrade.
func TestJoin_FailedReplayIsUnavailable(t *testing.T) {
	srv, _ := startJoinServer(t)
	req, err := http.NewRequest("GET", srv.URL+"/api/rooms/B-xY3kQ9/ws", nil)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("fly-replay-failed", "instance=B;reason=timeout;elapsed_ms=5000")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusServiceUnavailable)
	}
	if got := resp.Header.Get("fly-replay"); got != "" {
		t.Errorf("fly-replay = %q, want none", got)
	}
}

// Over the limit: still seated, but ice-servers carries no list and the
// TURN API isn't asked.
func TestJoin_OverTURNLimitGetsNoList(t *testing.T) {
	srv, fake := startJoinServerWithLimit(t, newLimiter(1, time.Hour))
	code := newTestRoom(t)

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
	code := newTestRoom(t)

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

func postRoom(h http.Handler) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("POST", "/api/rooms", nil))
	return rec
}

// Over the limit the caller gets 429 and no room is made.
func TestCreateRoom_OverLimitGets429(t *testing.T) {
	h := createRoomHandler(newLimiter(2, time.Hour), "local")
	for i := range 2 {
		rec := postRoom(h)
		if rec.Code != http.StatusOK {
			t.Fatalf("request %d: status = %d, want 200", i+1, rec.Code)
		}
	}
	before := len(rooms)
	rec := postRoom(h)
	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("third request: status = %d, want 429", rec.Code)
	}
	if len(rooms) != before {
		t.Errorf("rooms = %d, want %d (no room made)", len(rooms), before)
	}
}

// The key sent back is "{machineID}-{code}", and only the code goes in the
// rooms map: the machine part is for routing, not lookup.
func TestCreateRoom_KeyIsMachineIDThenCode(t *testing.T) {
	h := createRoomHandler(newLimiter(10, time.Hour), "A")
	rec := postRoom(h)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	key := rec.Body.String()
	code, found := strings.CutPrefix(key, "A-")
	if !found {
		t.Fatalf("key = %q, want it to start with %q", key, "A-")
	}
	if !roomCodePattern.MatchString(code) {
		t.Errorf("code = %q, want 6 letters or digits", code)
	}
	roomsMutex.Lock()
	_, exists := rooms[code]
	roomsMutex.Unlock()
	if !exists {
		t.Errorf("rooms has no entry for code %q", code)
	}
}

// readRevoked waits for the next revoke the handler asks for, failing the
// test if none comes within 2 seconds.
func readRevoked(t *testing.T, fake *fakeTURN) string {
	select {
	case username := <-fake.revoked:
		return username
	case <-time.After(2 * time.Second):
		t.Fatal("no revoke within 2s")
		return ""
	}
}

func TestTurnUsername(t *testing.T) {
	tests := []struct {
		name string
		list []map[string]any
		want string
	}{
		{"nil list", nil, ""},
		{"STUN only", []map[string]any{{"urls": "stun:stun.example"}}, ""},
		{"STUN then TURN", []map[string]any{
			{"urls": "stun:stun.example"},
			{"urls": "turn:turn.example", "username": "abc", "credential": "pw"},
		}, "abc"},
		{"username is not a string", []map[string]any{{"username": 42}}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := turnUsername(tt.list); got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

// Each seat's own credential is revoked when that seat is freed, and no
// other.
func TestLeave_RevokesThatSeatsCredential(t *testing.T) {
	srv, fake := startJoinServer(t)
	code := newTestRoom(t)
	a := dialRoom(t, srv, code)
	aName := turnUsername(readICEServers(t, a).IceServers)
	b := dialRoom(t, srv, code)
	bName := turnUsername(readICEServers(t, b).IceServers)

	b.CloseNow()
	if got := readRevoked(t, fake); got != bName {
		t.Errorf("first revoke = %q, want b's %q", got, bName)
	}
	a.CloseNow()
	if got := readRevoked(t, fake); got != aName {
		t.Errorf("second revoke = %q, want a's %q", got, aName)
	}
}

// A seat that got no list (over the TURN limit) has nothing to revoke.
func TestLeave_OverLimitSeatRevokesNothing(t *testing.T) {
	srv, fake := startJoinServerWithLimit(t, newLimiter(1, time.Hour))
	code := newTestRoom(t)
	a := dialRoom(t, srv, code)
	aName := turnUsername(readICEServers(t, a).IceServers)
	b := dialRoom(t, srv, code)
	readICEServers(t, b) // seated, but with no list

	b.CloseNow()
	readUntil(t, a, "partner-left") // b's leave has finished its first half
	a.CloseNow()
	// If b's leave had revoked "", it would arrive first.
	if got := readRevoked(t, fake); got != aName {
		t.Errorf("first revoke = %q, want a's %q", got, aName)
	}
}

// The partner hears partner-left even while the revoke is still stuck:
// revoking comes after, so a slow Cloudflare can't delay it.
func TestLeave_SlowRevokeDoesNotDelayPartnerLeft(t *testing.T) {
	srv, fake := startJoinServer(t)
	fake.block.Store(true)
	code := newTestRoom(t)
	a := dialRoom(t, srv, code)
	readICEServers(t, a)
	b := dialRoom(t, srv, code)
	readICEServers(t, b)

	b.CloseNow()
	readUntil(t, a, "partner-left")
	readRevoked(t, fake) // the revoke did start, and is still waiting
}

// A failed revoke is only logged: the partner is still told.
func TestLeave_FailedRevokeStillTellsPartner(t *testing.T) {
	srv, fake := startJoinServer(t)
	fake.failRevoke.Store(true)
	code := newTestRoom(t)
	a := dialRoom(t, srv, code)
	readICEServers(t, a)
	b := dialRoom(t, srv, code)
	bName := turnUsername(readICEServers(t, b).IceServers)

	b.CloseNow()
	readUntil(t, a, "partner-left")
	if got := readRevoked(t, fake); got != bName {
		t.Errorf("revoke = %q, want %q", got, bName)
	}
}
