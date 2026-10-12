<p align="center">
  <img src="logo.svg" width="64" height="64" alt="Anza Logo" />
</p>

<h1 align="center">Anza (Python Engine)</h1>

A template and dynamic fragment rendering library for Python web applications. Its only dependency is `cryptography`.

## What It Does

1. **Full-Page Rendering**: Renders pages into `layout/shell.html`, or into a default document with a `<template shadowrootmode="open">` Declarative Shadow DOM root.
2. **Dynamic Fragment Envelopes**: Renders targeted HTML partials inside JSON `Envelope` payloads (wire format v2) for partial UI updates.
3. **Payload Signing**: Signs dynamic payloads with HMAC-SHA256 or Ed25519, and checks received ones with `verify_envelope`.
4. **Streaming**: Helpers for Server-Sent Events (SSE) and WebSocket message formats.
5. **One Dependency**: The standard library plus `cryptography>=42`, installed with the package.

## Installation

```bash
pip install anza
```

Python 3.10+ is required. `cryptography` is installed automatically.

## Usage

### 1. Initialize Engine

```python
from anza import Setup, SignOptions

engine = Setup(
    root="./templates",
    signing=SignOptions(mode="hmac", secret="your-secret-key-at-least-32-chars-long"),
).run()
```

`Setup.run()` validates the key: an HMAC secret needs at least 32 bytes, and
an Ed25519 `private_key` must be a 32-byte seed, 64-char lowercase hex, or an
`Ed25519PrivateKey`. A bad key raises `AnzaError` with code `CRYPTO`. Other
options: `fragments` (fragment allowlist), `escape` (HTML-escape `{{x}}`),
`max_template_bytes` (default 1 MiB) and `watch=True` (reload on change; stop
with `engine.close()`).

### 2. Render Full Pages

```python
from anza import Page

# Renders pages/home.html inside layout/shell.html (as {{content}})
doc = Page("/", {"title": "My Application"}).run(engine)
print(doc.html)
```

### 3. Render Signed JSON Fragments

```python
from anza import Fragment

# Renders a specific template fragment targeting a slot
envelope = Fragment("card.html", "feed", {"title": "New Post"}).run(engine)

# envelope contains: v (2), slot, ts, html, and sig
print(envelope.to_json())
```

### 4. Verify Received Envelopes

```python
import json
from anza import VerifyKey, verify_envelope

# Raises AnzaError (code CRYPTO) on a bad version, age, slot or signature
verify_envelope(VerifyKey.hmac(secret), json.loads(body), max_age_secs=60, slot="feed")
```

### 5. FastAPI Integration Example

```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from anza import Setup, Page, Fragment, SignOptions

app = FastAPI()

engine = Setup(
    root="./templates",
    signing=SignOptions(mode="hmac", secret="your-secret-key-at-least-32-chars-long"),
).run()

@app.get("/", response_class=HTMLResponse)
def home():
    doc = Page("/", {"title": "Home"}).run(engine)
    return HTMLResponse(doc.html)

@app.get("/api/card/{card_id}")
def card(card_id: str):
    env = Fragment("card.html", "feed", {"id": card_id, "title": "Live Post"}).run(engine)
    return JSONResponse(env.to_dict())
```

## Templates

Templates use `{{name}}` (and raw `{{{name}}}`) placeholders and are parsed
once at startup. By default values are inserted without HTML escaping, so
escape user input with `escape_html` first, or set `escape=True`. An unknown
route raises `AnzaError` with code `NOT_FOUND`. Template layout,
rendering rules and signing: [docs/engines](https://github.com/anzaui/anza/tree/main/docs/engines)
([Python guide](https://github.com/anzaui/anza/blob/main/docs/engines/py.md)).

## License

MIT © 2026 aduki, Labs
