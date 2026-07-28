# Mode B example — Node (stdlib)

Prove that **any language** can emit the same HTML shape as Mode A SSG, without Anza owning the server runtime.

- **Anza does not run here.** This is a tiny `node:http` server (no Express/Fastify).
- Assets come from a built `dist/` (site root: `/app.js`, `/core/**`, `/tokens/**`, …).
- For `/docs/intro/start`, the server prefers the prebuilt SSG file under `dist/`; if missing, it falls back to `templates/docs-intro-start.html` (same contract: meta + open DSD + site-root scripts).

Formal HTML contract: [`docs/ssg/contract.md`](../../docs/ssg/contract.md).

## Prerequisites

Build the web app so `web/dist/` exists:

```bash
cd ../../web && npm run build
# or: anza build
```

## Run

```bash
cd examples/mode-b-node
node serve.js --dist ../../web/dist --port 8782
# or: npm start
```

Defaults: `--dist` → `../../web/dist`, `--port` → `8782`.

## Smoke check

```bash
curl -sL http://127.0.0.1:8782/docs/intro/start/ | grep -E '<title>|<h1>|shadowrootmode="open"|/app.js'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8782/app.js
```

Expect contentful HTML (title, H1, open Declarative Shadow DOM, `/app.js`) and `200` for the entry module.

## What this is / isn’t

| Is | Isn’t |
|----|--------|
| Any-lang Mode B proof | Anza SSR / Node DOM runtime |
| Static `dist/` + optional template | Express/Fastify requirement |
| Same HTML contract as Mode A | Crawler UA cloaking |
