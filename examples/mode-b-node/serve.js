#!/usr/bin/env node
/**
 * Mode B example: any-language HTML server for Anza static assets.
 *
 * Anza does not run here. Build assets first (`anza build` / `npm run build`
 * in `web/`), then serve `dist/` as the site root and emit the same HTML shape
 * as Mode A SSG for a couple of routes.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Routes this example can render. Prefer Mode A SSG under dist/; else templates. */
const MODE_B_ROUTES = {
  "/docs/intro/start": "docs-intro-start.html",
  "/docs/intro/start/": "docs-intro-start.html",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function htmlForRoute(dist, templates, routePath) {
  const templateName = MODE_B_ROUTES[routePath];
  if (!templateName) return null;

  const rel = routePath.replace(/^\/+|\/+$/g, "");
  const ssg = path.join(dist, ...rel.split("/"), "index.html");
  try {
    return fs.readFileSync(ssg);
  } catch {
    /* fall through */
  }

  const fallback = path.join(templates, templateName);
  try {
    return fs.readFileSync(fallback);
  } catch {
    return null;
  }
}

/** Map a URL path to a file under root; reject path traversal. */
function safeJoin(root, urlPath) {
  let raw = decodeURIComponent(urlPath);
  if (raw.endsWith("/")) raw += "index.html";
  else if (raw === "" || raw === "/") raw = "/index.html";

  const candidate = path.resolve(root, raw.replace(/^\/+/, ""));
  const rootResolved = path.resolve(root);
  if (candidate !== rootResolved && !candidate.startsWith(rootResolved + path.sep)) {
    return null;
  }
  return candidate;
}

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function send(res, method, code, ctype, body) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(code, {
    "Content-Type": ctype,
    "Content-Length": buf.length,
    "Cache-Control": "no-cache",
  });
  res.end(method === "HEAD" ? undefined : buf);
}

function createHandler(dist, templates) {
  return (req, res) => {
    const method = req.method || "GET";
    if (method !== "GET" && method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end("Method Not Allowed");
      return;
    }

    let p;
    try {
      p = new URL(req.url || "/", "http://127.0.0.1").pathname || "/";
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    // Mode B: contentful HTML for known routes (SSG or template).
    let html = htmlForRoute(dist, templates, p);
    if (html) {
      send(res, method, 200, "text/html; charset=utf-8", html);
      return;
    }

    // Directory-style routes without trailing slash → try .../index.html
    if (!p.endsWith("/") && !path.extname(p)) {
      html = htmlForRoute(dist, templates, p + "/");
      if (html) {
        send(res, method, 200, "text/html; charset=utf-8", html);
        return;
      }
    }

    // Everything else: static files from dist/ (site root).
    const target = safeJoin(dist, p);
    if (!target) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let file = target;
    try {
      const st = fs.statSync(target);
      if (st.isDirectory()) {
        file = path.join(target, "index.html");
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
      } else if (!st.isFile()) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }
    } catch {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    send(res, method, 200, contentType(file), fs.readFileSync(file));
  };
}

function main() {
  const defaultDist = path.resolve(__dirname, "../../web/dist");
  const { values } = parseArgs({
    options: {
      dist: { type: "string", default: defaultDist },
      port: { type: "string", default: "8782" },
      host: { type: "string", default: "127.0.0.1" },
    },
    strict: true,
  });

  const dist = path.resolve(values.dist);
  if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
    console.error(
      `dist not found: ${dist}\nBuild first: cd web && npm run build  (or anza build)`,
    );
    process.exit(1);
  }

  const templates = path.join(__dirname, "templates");
  const port = Number(values.port);
  const host = values.host;

  const server = http.createServer(createHandler(dist, templates));
  server.listen(port, host, () => {
    console.log("Mode B (Node) — Anza does not run here");
    console.log(`  dist:      ${dist}`);
    console.log(`  templates: ${templates}`);
    console.log(`  listen:    http://${host}:${port}/`);
    console.log("  try:       /docs/intro/start/  and  /app.js");
  });
}

main();
