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
	VideoID string `json:"videoId"`
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

	err = joinRoom(code, conn)
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
	defer leaveRoom(code, conn)

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
