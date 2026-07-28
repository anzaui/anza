#!/usr/bin/env python3
"""Mode B example: any-language HTML server for Anza static assets.

Anza does not run here. Build assets first (`anza build` / `npm run build`
in `web/`), then serve `dist/` as the site root and emit the same HTML shape
as Mode A SSG for a couple of routes.
"""

from __future__ import annotations

import argparse
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

# Routes this example can render. Prefer Mode A SSG files under dist/;
# fall back to checked-in templates that match the HTML contract.
MODE_B_ROUTES = {
    "/docs/intro/start": "docs-intro-start.html",
    "/docs/intro/start/": "docs-intro-start.html",
}


def resolve_dist(path: Path) -> Path:
    return path.expanduser().resolve()


def html_for_route(dist: Path, templates: Path, route_path: str) -> bytes | None:
    """Return HTML for a Mode B route, or None if this path is not Mode B."""
    template_name = MODE_B_ROUTES.get(route_path)
    if template_name is None:
        return None

    # Prefer prebuilt Mode A SSG (same contract, fuller content).
    rel = route_path.strip("/")
    ssg = dist / rel / "index.html"
    if ssg.is_file():
        return ssg.read_bytes()

    fallback = templates / template_name
    if fallback.is_file():
        return fallback.read_bytes()

    return None


def safe_join(root: Path, url_path: str) -> Path | None:
    """Map a URL path to a file under root; reject path traversal."""
    raw = unquote(url_path)
    if raw.endswith("/"):
        raw = raw + "index.html"
    elif raw == "" or raw == "/":
        raw = "/index.html"

    candidate = (root / raw.lstrip("/")).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate


class ModeBHandler(BaseHTTPRequestHandler):
    dist: Path
    templates: Path

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path or "/"

        # Mode B: contentful HTML for known routes (SSG or template).
        html = html_for_route(self.dist, self.templates, path)
        if html is not None:
            self._send(200, "text/html; charset=utf-8", html)
            return

        # Directory-style routes without trailing slash → try .../index.html
        if not path.endswith("/") and not Path(path).suffix:
            html = html_for_route(self.dist, self.templates, path + "/")
            if html is not None:
                self._send(200, "text/html; charset=utf-8", html)
                return

        # Everything else: static files from dist/ (site root).
        target = safe_join(self.dist, path)
        if target is None:
            self.send_error(403, "Forbidden")
            return

        if target.is_dir():
            index = target / "index.html"
            if index.is_file():
                target = index
            else:
                self.send_error(404, "Not Found")
                return

        if not target.is_file():
            self.send_error(404, "Not Found")
            return

        ctype, _ = mimetypes.guess_type(str(target))
        if ctype is None:
            ctype = "application/octet-stream"
        if ctype.startswith("text/") or ctype in (
            "application/javascript",
            "application/json",
            "image/svg+xml",
        ):
            ctype = f"{ctype}; charset=utf-8"

        self._send(200, ctype, target.read_bytes())

    def _send(self, code: int, content_type: str, body: bytes) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    here = Path(__file__).resolve().parent
    default_dist = (here / "../../web/dist").resolve()

    parser = argparse.ArgumentParser(
        description="Mode B example: serve Anza dist/ + contract HTML (no Anza runtime)."
    )
    parser.add_argument(
        "--dist",
        type=Path,
        default=default_dist,
        help=f"Path to built site root (default: {default_dist})",
    )
    parser.add_argument("--port", type=int, default=8780, help="Listen port (default: 8780)")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    args = parser.parse_args()

    dist = resolve_dist(args.dist)
    if not dist.is_dir():
        raise SystemExit(
            f"dist not found: {dist}\n"
            "Build first: cd web && npm run build  (or anza build)"
        )

    templates = here / "templates"

    class Handler(ModeBHandler):
        pass

    Handler.dist = dist
    Handler.templates = templates

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Mode B (Python) — Anza does not run here", flush=True)
    print(f"  dist:      {dist}", flush=True)
    print(f"  templates: {templates}", flush=True)
    print(f"  listen:    http://{args.host}:{args.port}/", flush=True)
    print(f"  try:       /docs/intro/start/  and  /app.js", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nbye", flush=True)
        server.server_close()


if __name__ == "__main__":
    main()
