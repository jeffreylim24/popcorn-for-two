package main

import "net/http"

// spaHandler serves the built frontend in dir. A path that matches a file
// (JS, CSS, images) gets that file; anything else gets index.html, so a
// page reload or shared link like /room/abc123 still loads the app, which
// then routes in the browser.
func spaHandler(dir string) http.Handler {
	files := http.Dir(dir)
	fileServer := http.FileServer(files)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, err := files.Open(r.URL.Path)
		if err != nil {
			http.ServeFile(w, r, dir+"/index.html")
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	})
}
