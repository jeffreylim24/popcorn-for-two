package main

import "testing"

func TestLoadTestMode(t *testing.T) {
	tests := []struct {
		name       string
		loadTest   string
		flyAppName string
		want       bool
		wantErr    bool
	}{
		{"unset, local", "", "", false, false},
		{"unset, production", "", prodAppName, false, false},
		{"on, local", "1", "", true, false},
		{"on, load-test app", "1", "popcorn-for-two-load", true, false},
		{"on, production is refused", "1", prodAppName, false, true},
		{"any other value is off", "true", "", false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := loadTestMode(tt.loadTest, tt.flyAppName)
			if got != tt.want {
				t.Errorf("loadTestMode = %v, want %v", got, tt.want)
			}
			if (err != nil) != tt.wantErr {
				t.Errorf("err = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
