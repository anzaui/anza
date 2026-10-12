---
seo_title: "Python STUI Engine — Anza"
description: "Python STUI engine for FastAPI, Flask, ASGI, and WSGI, built on the standard library and cryptography."
---

# Python Engine

The Anza Python Engine (`anza` on PyPI) renders full HTML pages and signed JSON
fragment envelopes from `.html` templates. It needs Python 3.10+ and
`cryptography>=42`, which `pip install anza` installs. The rest is the
standard library. It follows the shared [Engine Contract](contract.md).

## What You Get

- **Parse once** — `Setup(...).run()` loads every template under the root and splits it into static chunks and `{{slot}}` placeholders
- **Plain Python data** — bind dicts, dataclasses, Pydantic models or any object with attributes
- **Signing** — HMAC-SHA256 or Ed25519 signatures (signature v2), with keys validated at setup
- **Verification** — `verify_envelope` checks version, age, slot and signature
- **Streaming** — `format_event` (SSE) and `format_packet` (WebSocket) encoders, and a `Stream` operation
- **Adapters** — small response helpers for FastAPI/Starlette, Flask, raw ASGI and WSGI

## Installation

```bash
pip install anza
```

## Quickstart (FastAPI)

```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from anza import Setup, SignOptions, Page, Fragment

# 1. Load and parse every template once at startup (the secret needs 32+ bytes)
engine = Setup(
    root="./templates",
    signing=SignOptions(mode="hmac", secret="super-secret-key-32-bytes-long!!"),
).run()

app = FastAPI()

# Full page: templates/pages/home.html inside templates/layout/shell.html
# (or inside the default document when there is no shell)
@app.get("/", response_class=HTMLResponse)
async def home():
    doc = Page("/", {"title": "Anza Python"}).run(engine)
    return doc.html

# Fragment: templates/feed/card.html as a signed JSON envelope
@app.get("/card")
async def card():
    envelope = Fragment("feed/card.html", "feed", {"title": "Live Python Card"}).run(engine)
    return JSONResponse(envelope.to_dict())
```

## Flask Integration (WSGI)

```python
from flask import Flask, Response, jsonify
from anza import Setup, Page, Fragment

engine = Setup(root="./templates").run()
app = Flask(__name__)

@app.route("/")
def home():
    doc = Page("/", {"title": "Flask"}).run(engine)
    return Response(doc.html, mimetype="text/html")

@app.route("/card")
def card():
    envelope = Fragment("feed/card.html", "feed", {"title": "Item"}).run(engine)
    return jsonify(envelope.to_dict())
```

`anza.adapters.fastapi`, `anza.adapters.flask`, `anza.adapters.asgi` and
`anza.adapters.wsgi` provide the same responses as helpers (`html_response` /
`json_response`, or `send_html` / `send_json`).

## Dataclass Binding

```python
from dataclasses import dataclass
from anza import Page

@dataclass
class UserProfile:
    user_id: str
    user_name: str
    role: str

profile = UserProfile(user_id="usr_102", user_name="Alice", role="Admin")
doc = Page("/profile", profile).run(engine)
```

`{{user_name}}` reads `profile.user_name`. Only public, non-callable attributes
are read: names starting with `_` and methods render as empty. Missing values
and `None` render as empty, booleans as `true` / `false`, integral floats
without `.0`, and dicts, lists and tuples as compact JSON (`{"a":1}`).

## Escaping

By default values are inserted **as is, without HTML escaping**. Escape user
input with `escape_html` before passing it in, or turn on the `escape` option:

```python
from anza import Setup, escape_html

escape_html('<a href="x">Tom & Jerry\'s</a>')
# '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;'

engine = Setup(root="./templates", escape=True).run()
```

With `escape=True`, `{{name}}` is HTML-escaped and `{{{name}}}` stays raw. Use
`{{{content}}}` in `layout/shell.html` so the rendered page is not escaped
twice.

## Signing

```python
from anza import Setup, SignOptions

Setup(root="./templates", signing=SignOptions(mode="hmac", secret="<at least 32 bytes>"))
Setup(root="./templates", signing=SignOptions(mode="ed25519", private_key="<64 lowercase hex chars>"))
Setup(root="./templates")  # mode="none": no signature
```

`SignOptions(mode, secret, private_key, public_key)` is checked once, in
`Setup.run()`. A bad key raises `AnzaError` with code `CRYPTO`:

- `hmac` needs a `secret` (str or bytes) of at least 32 bytes.
- `ed25519` needs a `private_key` as a 32-byte seed (`bytes`), 64-char
  lowercase hex, or a `cryptography` `Ed25519PrivateKey`. An optional
  `public_key` must match it.

The validated key is `engine.signer`. `repr` of `SignOptions`, `Signer` and
`Engine` never prints key material.

The signature covers the v2 message built by `signature_message(ts, slot,
html, css)` (also `envelope.message()`). Check a received envelope with
`verify_envelope`:

```python
import json
from anza import VerifyKey, verify_envelope

envelope = json.loads(body)
verify_envelope(VerifyKey.hmac(secret), envelope, max_age_secs=60, slot="feed")
verify_envelope(VerifyKey.ed25519(public_key), envelope, max_age_secs=60, slot="feed")
engine.verify_envelope(envelope, max_age_secs=60, slot="feed")  # the engine's own key
```

Each call returns `None` or raises `AnzaError` with code `CRYPTO` (for example
`envelope expired` or `slot mismatch`). See
[Cryptographic Verification](crypto.md).

## Page Rendering

`Page(route, params)` maps the route to a template: `/` → `pages/home.html`,
`/about` and `/about/` → `pages/about.html`. Routes only resolve under
`pages/`. When the page doesn't exist, `pages/index.html` is the catch-all.
Otherwise, or for a malformed route (`..`, `\`, NUL), `Page.run` raises
`AnzaError` with code `NOT_FOUND` and the message `Page not found`.

The page markup is inserted as is (no wrapper element) into
`layout/shell.html` as `{{content}}`. The shell is bound with `params` plus
`content`. When there is no shell, the page goes into a minimal default
document with a `<dock-main>` open shadow root.

## Setup Options

```python
engine = Setup(
    root="./templates",
    signing=SignOptions(mode="hmac", secret=secret),
    fragments=["feed/", "partials/menu.html"],  # fragment allowlist
    escape=True,                                # escape {{x}}, keep {{{x}}} raw
    max_template_bytes=512 * 1024,              # default 1 MiB
    watch=True,                                 # reload on change
).run()

engine.close()  # stops the watcher
```

- `fragments` limits which templates `Fragment` can render. An entry ending in
  `/` allows that prefix and any other entry allows that exact name. Anything
  else is reported as `Template '<name>' not found`. Empty (the default)
  allows every template.
- `max_template_bytes` makes a larger file a `TEMPLATE` error at load.
- `watch=True` starts a polling thread that reloads the templates when files
  are added, changed or removed. Stop it with `engine.close()`.

Template names are relative `/`-separated paths (no leading `/`, `\`, NUL,
or empty, `.` or `..` segments). A malformed name is a `VALIDATION` error.
Lookups only use the templates loaded at setup: a cache miss is `NOT_FOUND`
and never reads from disk.

## Streaming (SSE)

```python
import asyncio
from fastapi.responses import StreamingResponse
from anza import Fragment, format_event

@app.get("/feed/stream")
async def stream_feed():
    async def events():
        while True:
            envelope = Fragment("feed/card.html", "feed", {"title": "Push"}).run(engine)
            yield format_event(envelope)   # 'event: template\ndata: {"v":2,...}\n\n'
            await asyncio.sleep(2)
    return StreamingResponse(events(), media_type="text/event-stream")
```

The JSON is `envelope.to_json()`: compact, UTF-8, `v` first, byte-identical to
the Rust and TypeScript engines. `format_packet(envelope)` returns the same
JSON for WebSocket messages. `Stream(template, slot, params).run(engine)`
returns the SSE text in one call. See [Real-Time Streaming](streaming.md).

## Package Layout

| Package | Contents |
|---------|----------|
| `anza.data.input` | `Setup`, `Page`, `Fragment`, `Stream` |
| `anza.engine.slot` | `{{slot}}` parser (`extract`), binder (`string`), `escape_html` |
| `anza.engine.file` | Template loading, reading and watching |
| `anza.engine.cache` | `Engine`, `SignOptions`, the template store |
| `anza.render` | `render_page`, `render_fragment` |
| `anza.crypto` | `hmac`, `ed25519`, `hkdf`, `digest` (SHA-256), `hex`, `signer` (`Signer`), `envelope` (`verify_envelope`, `VerifyKey`, `signature_message`) |
| `anza.stream` | `format_event` (SSE), `format_packet` (WebSocket) |
| `anza.adapters` | FastAPI, Flask, ASGI, WSGI helpers |
| `anza.models` | `Document`, `Envelope`, `Manifest` |
