package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/coder/websocket"
)

// peekMessage is a message the server sends: a type, plus videoId for
// "video" messages. Client messages are read with jsonFields instead.
type peekMessage struct {
	Type    string `json:"type"`
	VideoID string `json:"videoId,omitempty"`
}

// iceServersMessage tells the browser which STUN + TURN servers to use. A
// missing iceServers means Cloudflare failed: keep your own fallback.
type iceServersMessage struct {
	Type       string           `json:"type"`
	IceServers []map[string]any `json:"iceServers,omitempty"`
}

// serverOnlyTypes are message types only the server may send. A client
// sending one is dropped, not relayed: a faked ice-servers could route the
// partner's call through a TURN server the sender runs, and a faked
// partner-left could end their call.
var serverOnlyTypes = map[string]bool{
	"ice-servers":     true,
	"partner-joined":  true,
	"partner-present": true,
	"partner-left":    true,
}

// isServerOnlyType reports whether only the server may send messages of
// type t.
func isServerOnlyType(t string) bool {
	return serverOnlyTypes[t]
}

// jsonFields splits a JSON object into its raw fields, keyed exactly as
// sent; a repeated key keeps its last value. That is how the browser's
// JSON.parse reads it. Unmarshaling into a struct instead matches keys
// ignoring case, so {"type":"partner-left","Type":"offer"} would read as
// "offer" here but "partner-left" in the browser.
func jsonFields(msg []byte) (map[string]json.RawMessage, error) {
	var fields map[string]json.RawMessage
	err := json.Unmarshal(msg, &fields)
	return fields, err
}

// stringField returns fields[name] as a string. ok is false if it is
// missing or not a string.
func stringField(fields map[string]json.RawMessage, name string) (string, bool) {
	var s string
	err := json.Unmarshal(fields[name], &s)
	if err != nil {
		return "", false
	}
	return s, true
}

// sendJSON marshals v and writes it to c as one text message, giving up
// after 5 seconds.
func sendJSON(ctx context.Context, c *websocket.Conn, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return c.Write(ctx, websocket.MessageText, data)
}

// A heartbeat says how often the server pings each connection and how long
// it waits for the pong. One missed pong closes the connection, so a dead
// one is noticed within every + timeout.
type heartbeat struct {
	every   time.Duration
	timeout time.Duration
}

// keepAlive pings conn every hb.every until ctx ends. If a pong doesn't
// come back within hb.timeout, it closes conn: the handler's blocked Read
// then fails and the usual leave path frees the seat. It never touches the
// room itself, so leaving keeps one exit path. Ping needs a Read running at
// the same time (that's what reads the pong), so start it beside the read
// loop.
func keepAlive(ctx context.Context, conn *websocket.Conn, hb heartbeat) {
	ticker := time.NewTicker(hb.every)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			pingCtx, cancel := context.WithTimeout(ctx, hb.timeout)
			err := conn.Ping(pingCtx)
			cancel()
			if err != nil {
				// The handler already returned: not a missed pong.
				if ctx.Err() != nil {
					return
				}
				log.Println("No pong, closing connection:", err)
				// CloseNow, not Close: Close waits for a goodbye that a dead
				// peer will never send.
				conn.CloseNow()
				return
			}
		}
	}
}

// healthHandler answers GET /api/health so you can check the server is up.
func healthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Health check: OK")
}

// createRoomHandler answers POST /api/rooms with the new room's code as
// plain text. A caller over createLimit gets 429, and 503 if the server is
// already holding its maximum number of rooms.
func createRoomHandler(createLimit *limiter) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !createLimit.allow(clientIP(r)) {
			log.Println("Room creation limit reached:", clientIP(r))
			http.Error(w, "Too many rooms created, try again later", http.StatusTooManyRequests)
			return
		}
		roomCode, err := createRoom()
		if err != nil {
			log.Println("Error creating room:", err)
			http.Error(w, "Server is full, try again later", http.StatusServiceUnavailable)
			return
		}
		fmt.Fprint(w, roomCode)
	})
}

// joinRoomHandler upgrades GET /api/rooms/{code}/ws to a WebSocket and
// puts the caller in that room. It sends the caller short-lived STUN +
// TURN servers, tells both people when a partner is present, sends the
// room's current video, then relays every message to the partner until the
// connection drops. A full or unknown room is closed with statusRoomFull
// or statusRoomNotFound, and gets no TURN credentials: getICE is only
// called for a seat holder, and only while turnLimit allows their IP. A
// connection that stops answering hb's pings is closed and loses its seat.
func joinRoomHandler(getICE iceServersFunc, revoke revokeFunc, turnLimit *limiter, hb heartbeat) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		code := r.PathValue("code")
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			log.Println("Failed to accept websocket connection:", err)
			return
		}
		// Safety net: every return path below ends the connection.
		defer conn.CloseNow()

		partner, err := joinRoom(code, conn)
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
		// turnUser is this seat's TURN username, or "" if it got no
		// credentials. It is declared before the defer and set later: the
		// closure reads it when the defer runs, not when it is registered.
		var turnUser string
		defer func() {
			// Tell whoever is still here, so they can close the call.
			if p := leaveRoom(code, conn); p != nil {
				err := sendJSON(r.Context(), p, peekMessage{Type: "partner-left"})
				if err != nil {
					log.Println("Error writing partner-left:", err)
				}
			}
			// Revoke last, so a slow Cloudflare never delays partner-left.
			// A fresh context, not r.Context(): that belongs to the
			// connection that just ended. A failure only means the
			// credential lives out its TTL, so log it and move on.
			if turnUser != "" {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				err := revoke(ctx, turnUser)
				cancel()
				if err != nil {
					log.Println("Error revoking TURN credential:", err)
				}
			}
		}()

		// Only a seat holder reaches this line, so it doubles as the seat
		// check for TURN. Keep it before the partner notices: useCall makes
		// its phone on partner-present without waiting, trusting that
		// ice-servers came first. On failure the list is left out and the
		// browser keeps its STUN fallback. Over the per-IP limit, the list is
		// left out the same way: they keep their seat, just not our paid
		// relay. (Limiting joins themselves is #9's job.)
		var iceServers []map[string]any
		if turnLimit.allow(clientIP(r)) {
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			iceServers, err = getICE(ctx)
			cancel()
			if err != nil {
				log.Println("Error getting ICE servers:", err)
			}
			turnUser = turnUsername(iceServers)
		} else {
			log.Println("TURN limit reached, sending no list")
		}
		err = sendJSON(r.Context(), conn, iceServersMessage{Type: "ice-servers", IceServers: iceServers})
		if err != nil {
			log.Println("Error writing ice-servers:", err)
		}

		// Someone was here first: they wait, and the newcomer makes the WebRTC
		// offer. Different messages give each side its role, so they never both
		// offer at once.
		if partner != nil {
			err = sendJSON(r.Context(), partner, peekMessage{Type: "partner-joined"})
			if err != nil {
				log.Println("Error writing partner-joined:", err)
			}
			err = sendJSON(r.Context(), conn, peekMessage{Type: "partner-present"})
			if err != nil {
				log.Println("Error writing partner-present:", err)
			}
		}

		// A newcomer loads the video the room is already on. Failing here is
		// not fatal: the call works without it.
		id := getRoomVideo(code)
		if id != "" {
			data, err := json.Marshal(peekMessage{Type: "video", VideoID: id})
			if err != nil {
				log.Println("Error marshaling message:", err)
			} else {
				ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
				err = conn.Write(ctx, websocket.MessageText, data)
				cancel()
				if err != nil {
					log.Println("Error writing video message:", err)
				}
			}
		}

		// The heartbeat runs beside the relay loop's Read and stops when the
		// handler returns.
		hbCtx, stopHeartbeat := context.WithCancel(r.Context())
		defer stopHeartbeat()
		go keepAlive(hbCtx, conn, hb)

		// Relay loop. Read errors include a normal close and a missed pong, so
		// returning here is how a client leaves; the deferred leaveRoom then
		// runs.
		for {
			typ, msg, err := conn.Read(r.Context())
			if err != nil {
				log.Println("Error reading message:", err)
				return
			}

			fields, err := jsonFields(msg)
			if err != nil {
				log.Println("Error unmarshaling message:", err)
				continue
			}
			// No readable type: drop it rather than guess what the browser
			// will make of it.
			msgType, ok := stringField(fields, "type")
			if !ok {
				log.Println("Dropped message with no string type")
				continue
			}
			// Clients can't speak for the server.
			if isServerOnlyType(msgType) {
				log.Println("Dropped server-only message from client:", msgType)
				continue
			}
			// Remember the video for whoever joins later. An invalid ID is
			// dropped, not forwarded, so both sides stay on the same video.
			if msgType == "video" {
				videoID, _ := stringField(fields, "videoId")
				err = setRoomVideo(code, videoID)
				if err != nil {
					log.Println("Error setting room video:", err)
					continue
				}
			}

			// Look the partner up per message: they may have left or joined
			// since we arrived.
			partner := getPartnerConn(code, conn)
			if partner == nil {
				continue
			}

			// Timeout so a stalled partner can't freeze this loop; cancel now,
			// not with defer, which would pile up until the handler returns.
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			err = partner.Write(ctx, typ, msg)
			cancel()
			if err != nil {
				log.Println("Error writing message to partner:", err)
			}
		}
	})
}

// iceServersFunc gets a fresh STUN + TURN list. main passes one that asks
// Cloudflare; tests pass a fake, so they never touch the real API.
type iceServersFunc func(ctx context.Context) ([]map[string]any, error)

// revokeFunc revokes one TURN credential by its username. main passes one
// that asks Cloudflare; tests pass a fake.
type revokeFunc func(ctx context.Context, username string) error

// turnUsername returns the TURN username in an iceServers list, or "" if
// the list has none (nil, STUN only, or Cloudflare failed).
func turnUsername(servers []map[string]any) string {
	for _, server := range servers {
		username, ok := server["username"].(string)
		if ok {
			return username
		}
	}
	return ""
}

// getICEServers asks Cloudflare for TURN credentials that last 4 hours
// (longer than the longest movie night) and returns its iceServers list.
func getICEServers(ctx context.Context, turnKeyID, turnKeyAPI string) ([]map[string]any, error) {
	url := fmt.Sprintf("https://rtc.live.cloudflare.com/v1/turn/keys/%s/credentials/generate-ice-servers", turnKeyID)
	body := strings.NewReader(`{"ttl": 14400}`)
	req, err := http.NewRequestWithContext(ctx, "POST", url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+turnKeyAPI)
	req.Header.Set("Content-Type", "application/json")

	// err means no reply at all: network error or the timeout.
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// A reply, but a bad one, is not an err, so check it ourselves.
	// Cloudflare answers 201 Created on success.
	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("cloudflare returned status %d", resp.StatusCode)
	}

	var out struct {
		IceServers []map[string]any `json:"iceServers"`
	}
	err = json.NewDecoder(resp.Body).Decode(&out)
	if err != nil {
		return nil, err
	}
	return out.IceServers, nil
}

// revokeTURNCredential asks Cloudflare to stop accepting a credential, so
// a seat's username and password are useless once the seat is freed.
// Cloudflare answers 204 No Content on success.
func revokeTURNCredential(ctx context.Context, turnKeyID, turnKeyAPI, username string) error {
	// PathEscape keeps a username with odd characters inside its path piece.
	endpoint := fmt.Sprintf("https://rtc.live.cloudflare.com/v1/turn/keys/%s/credentials/%s/revoke", turnKeyID, url.PathEscape(username))
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+turnKeyAPI)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("cloudflare returned status %d", resp.StatusCode)
	}
	return nil
}
