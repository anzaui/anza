// Mode B example: any-language HTML server for Anza static assets.
//
// Anza does not run here. Build assets first (`anza build` / `npm run build`
// in `web/`), then serve `dist/` as the site root and emit the same HTML shape
// as Mode A SSG for a couple of routes.
package main

import (
	"flag"
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// Routes this example can render. Prefer Mode A SSG files under dist/;
// fall back to checked-in templates that match the HTML contract.
var modeBRoutes = map[string]string{
	"/docs/intro/start":  "docs-intro-start.html",
	"/docs/intro/start/": "docs-intro-start.html",
}

func htmlForRoute(dist, templates, routePath string) ([]byte, bool) {
	templateName, ok := modeBRoutes[routePath]
	if !ok {
		return nil, false
	}

	// Prefer prebuilt Mode A SSG (same contract, fuller content).
	rel := strings.Trim(routePath, "/")
	ssg := filepath.Join(dist, filepath.FromSlash(rel), "index.html")
	if data, err := os.ReadFile(ssg); err == nil {
		return data, true
	}

	fallback := filepath.Join(templates, templateName)
	if data, err := os.ReadFile(fallback); err == nil {
		return data, true
	}

	return nil, false
}

// safeJoin maps a URL path to a file under root; rejects path traversal.
func safeJoin(root, urlPath string) (string, bool) {
	raw, err := url.PathUnescape(urlPath)
	if err != nil {
		return "", false
	}
	if strings.HasSuffix(raw, "/") {
		raw += "index.html"
	} else if raw == "" || raw == "/" {
		raw = "/index.html"
	}

	candidate := filepath.Join(root, filepath.FromSlash(strings.TrimPrefix(raw, "/")))
	resolved, err := filepath.Abs(candidate)
	if err != nil {
		return "", false
	}
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return "", false
	}
	if resolved != rootAbs && !strings.HasPrefix(resolved, rootAbs+string(os.PathSeparator)) {
		return "", false
	}
	return resolved, true
}

func contentType(name string) string {
	ctype := mime.TypeByExtension(filepath.Ext(name))
	if ctype == "" {
		ctype = "application/octet-stream"
	}
	if strings.HasPrefix(ctype, "text/") ||
		ctype == "application/javascript" ||
		ctype == "text/javascript" ||
		ctype == "application/json" ||
		ctype == "image/svg+xml" {
		if !strings.Contains(ctype, "charset") {
			ctype += "; charset=utf-8"
		}
	}
	return ctype
}

type server struct {
	dist      string
	templates string
}

func (s *server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	p := r.URL.Path
	if p == "" {
		p = "/"
	}

	// Mode B: contentful HTML for known routes (SSG or template).
	if html, ok := htmlForRoute(s.dist, s.templates, p); ok {
		s.send(w, r, http.StatusOK, "text/html; charset=utf-8", html)
		return
	}

	// Directory-style routes without trailing slash → try .../index.html
	if !strings.HasSuffix(p, "/") && path.Ext(p) == "" {
		if html, ok := htmlForRoute(s.dist, s.templates, p+"/"); ok {
			s.send(w, r, http.StatusOK, "text/html; charset=utf-8", html)
			return
		}
	}

	// Everything else: static files from dist/ (site root).
	target, ok := safeJoin(s.dist, p)
	if !ok {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	info, err := os.Stat(target)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if info.IsDir() {
		index := filepath.Join(target, "index.html")
		if _, err := os.Stat(index); err != nil {
			http.NotFound(w, r)
			return
		}
		target = index
	}

	data, err := os.ReadFile(target)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	s.send(w, r, http.StatusOK, contentType(target), data)
}

func (s *server) send(w http.ResponseWriter, r *http.Request, code int, ctype string, body []byte) {
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(body)))
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(code)
	if r.Method != http.MethodHead {
		_, _ = w.Write(body)
	}
}

func main() {
	here, err := os.Getwd()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defaultDist := filepath.Clean(filepath.Join(here, "../../web/dist"))

	distFlag := flag.String("dist", defaultDist, "Path to built site root")
	port := flag.Int("port", 8781, "Listen port")
	host := flag.String("host", "127.0.0.1", "Bind address")
	flag.Parse()

	dist, err := filepath.Abs(*distFlag)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	info, err := os.Stat(dist)
	if err != nil || !info.IsDir() {
		fmt.Fprintf(os.Stderr, "dist not found: %s\nBuild first: cd web && npm run build  (or anza build)\n", dist)
		os.Exit(1)
	}

	templates := filepath.Join(here, "templates")

	addr := fmt.Sprintf("%s:%d", *host, *port)
	srv := &server{dist: dist, templates: templates}

	fmt.Println("Mode B (Go) — Anza does not run here")
	fmt.Printf("  dist:      %s\n", dist)
	fmt.Printf("  templates: %s\n", templates)
	fmt.Printf("  listen:    http://%s/\n", addr)
	fmt.Println("  try:       /docs/intro/start/  and  /app.js")

	if err := http.ListenAndServe(addr, srv); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
