# Mode B example — Python (stdlib)

Prove that **any language** can emit the same HTML shape as Mode A SSG, without Anza owning the server runtime.

- **Anza does not run here.** This is a tiny `http.server` subclass.
- Assets come from a built `dist/` (site root: `/app.js`, `/core/**`, `/tokens/**`, …).
- For `/docs/intro/start`, the server prefers the prebuilt SSG file under `dist/`; if missing, it falls back to `templates/docs-intro-start.html` (same contract: meta + open DSD + site-root scripts).

Formal HTML contract (when present): [`docs/ssg/contract.md`](../../docs/ssg/contract.md).

## Prerequisites

Build the web app so `web/dist/` exists:

```bash
cd ../../web && npm run build
# or: anza build
```

## Run

```bash
cd examples/mode-b-python
python3 serve.py --dist ../../web/dist --port 8780
```

Defaults: `--dist` → `../../web/dist`, `--port` → `8780`.

## Smoke check

```bash
curl -sL http://127.0.0.1:8780/docs/intro/start/ | grep -E '<title>|<h1>|shadowrootmode="open"|/app.js'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8780/app.js
```

Expect contentful HTML (title, H1, open Declarative Shadow DOM, `/app.js`) and `200` for the entry module.

## What this is / isn’t

| Is | Isn’t |
|----|--------|
| Any-lang Mode B proof | Anza SSR / Node DOM runtime |
| Static `dist/` + optional template | Flask/Django requirement |
| Same HTML contract as Mode A | Crawler UA cloaking |
