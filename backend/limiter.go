package main

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// A limiter allows each client IP at most max attempts per window. All
// counts reset together when a window ends, so memory never holds more
// than one window's worth of IPs. Someone can use their allowance just
// before and just after a reset (a 2x burst), which is fine at our scale.
// Safe for concurrent use.
type limiter struct {
	mu     sync.Mutex
	counts map[string]int
	// start is when the current window began.
	start  time.Time
	max    int
	window time.Duration
}

// newLimiter returns a limiter allowing max attempts per IP per window.
func newLimiter(max int, window time.Duration) *limiter {
	return &limiter{
		counts: map[string]int{},
		start:  time.Now(),
		max:    max,
		window: window,
	}
}

// allow counts one attempt from ip and reports whether it is within the
// limit. The count and the check share one lock, so two attempts at once
// can't both see room for one more.
func (l *limiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	// Reset lazily, on the first attempt after the window ends: no timer
	// goroutine to start or stop.
	if time.Since(l.start) >= l.window {
		l.counts = map[string]int{}
		l.start = time.Now()
	}
	l.counts[ip]++
	return l.counts[ip] <= l.max
}

// clientIP returns the caller's IP. On Fly, the proxy sets Fly-Client-IP
// (safe to trust there, per Fly's docs); in dev and tests it's missing, so
// fall back to the TCP peer address. Trusting the header assumes the app
// only runs behind Fly's proxy.
func clientIP(r *http.Request) string {
	ip := r.Header.Get("Fly-Client-IP")
	if ip != "" {
		return ip
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
