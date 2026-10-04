package main

import (
	"fmt"
	"log"
	"net/http"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Health check: OK")
}

func main() {
	http.HandleFunc("GET /health", healthHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
