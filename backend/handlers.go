package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
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
