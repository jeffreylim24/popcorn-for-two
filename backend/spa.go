package main

import "net/http"

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
