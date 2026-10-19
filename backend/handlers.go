package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/coder/websocket"
)

type peekMessage struct {
	Type    string `json:"type"`
	VideoID string `json:"videoId,omitempty"`
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
	defer func() {
		// Tell whoever is still here, so they can close the call
		if p := leaveRoom(code, conn); p != nil {
			err := sendJSON(r.Context(), p, peekMessage{Type: "partner-left"})
			if err != nil {
				log.Println("Error writing partner-left:", err)
			}
		}
	}()

	// Someone was here first: they wait, and the newcomer makes the offer
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

	// Send the current video ID to the newly joined client
	id := getRoomVideo(code)
	if id != "" {
		data, err := json.Marshal(peekMessage{Type: "video", VideoID: id})
		if err != nil {
			log.Println("Error marshaling message:", err)
			// Call can continue without sending videoId
		} else {
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			err = conn.Write(ctx, websocket.MessageText, data)
			cancel()
			if err != nil {
				log.Println("Error writing video message:", err)
				// Call can continue without sending videoId
			}
		}
	}

	for {
		typ, msg, err := conn.Read(r.Context())
		if err != nil {
			log.Println("Error reading message:", err)
			return
		}

		var peek peekMessage
		err = json.Unmarshal(msg, &peek)
		if err != nil {
			log.Println("Error unmarshaling message:", err)
			continue
		}
		if peek.Type == "video" {
			err = setRoomVideo(code, peek.VideoID)
			if err != nil {
				log.Println("Error setting room video:", err)
				continue
			}
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

// iceServersHandler sends the browser short-lived STUN + TURN servers as
// {"iceServers": [...]}. The long-term key stays on the server; the
// browser only gets credentials that expire.
func iceServersHandler(turnKeyID, turnKeyAPI string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Give up after 5 seconds; also cancelled if the browser leaves
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		iceServers, err := getICEServers(ctx, turnKeyID, turnKeyAPI)
		if err != nil {
			// Details stay in our logs, not in the browser
			log.Println("Error getting ICE servers:", err)
			http.Error(w, "TURN unavailable", http.StatusBadGateway)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		err = json.NewEncoder(w).Encode(map[string]any{"iceServers": iceServers})
		if err != nil {
			log.Println("Error writing ICE servers:", err)
		}
	})
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

	// err means no reply at all: network error or the timeout
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// A reply, but a bad one, is not an err, so check it ourselves
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
