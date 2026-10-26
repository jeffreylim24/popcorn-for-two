package main

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestLimiter_AllowsUpToMax(t *testing.T) {
	l := newLimiter(2, time.Hour)
	want := []bool{true, true, true, false}
	for i, w := range want {
		if got := l.allow("1.2.3.4"); got != w {
			t.Errorf("attempt %d: allow = %v, want %v", i+1, got, w)
		}
	}
}

func TestLimiter_CountsEachIPSeparately(t *testing.T) {
	l := newLimiter(1, time.Hour)
	l.allow("1.2.3.4")
	if !l.allow("5.6.7.8") {
		t.Errorf("a second IP was refused, want allowed")
	}
}

// The window is rewound by hand instead of sleeping, so the test is fast
// and never flaky.
func TestLimiter_ResetsAfterWindow(t *testing.T) {
	l := newLimiter(1, time.Hour)
	l.allow("1.2.3.4")
	l.start = l.start.Add(-time.Hour)
	if !l.allow("1.2.3.4") {
		t.Errorf("refused after the window ended, want allowed")
	}
}

func TestClientIP(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.1:5555"
	if got := clientIP(r); got != "10.0.0.1" {
		t.Errorf("no header: got %q, want 10.0.0.1", got)
	}
	r.Header.Set("Fly-Client-IP", "203.0.113.7")
	if got := clientIP(r); got != "203.0.113.7" {
		t.Errorf("with Fly-Client-IP: got %q, want 203.0.113.7", got)
	}
}
