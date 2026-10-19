package main

import "testing"

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
