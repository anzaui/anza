---
seo_title: "Python STUI Engine — Anza"
description: "Zero-dependency Python standard library STUI engine for FastAPI, Flask, ASGI, and WSGI."
---

# Python Engine

The Anza Python Engine (`anza` on PyPI) renders full HTML pages and signed JSON
fragment envelopes from `.html` templates. It needs Python 3.10+ and only the
standard library (Ed25519 uses `cryptography` when it is installed, and a pure
Python fallback otherwise).

## What You Get

- **Parse once** — `Setup(...).run()` loads every template under the root and splits it into static chunks and `{{slot}}` placeholders
- **Plain Python data** — bind dicts, dataclasses, Pydantic models or any object with attributes
- **Signing** — HMAC-SHA256 or Ed25519 signatures over `ts:slot:html`
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

# 1. Load and parse every template once at startup
engine = Setup(
    root="./templates",
    signing=SignOptions(mode="hmac", secret="super-secret-key-32-bytes-long!!"),
).run()

app = FastAPI()

# Full page: templates/pages/home.html inside templates/layout/shell.html
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

`{{user_name}}` reads `profile.user_name`. Missing values render as empty.
Values are inserted **as is, without HTML escaping**: escape user input before
passing it in.

## Signing

```python
from anza import Setup, SignOptions

Setup(root="./templates", signing=SignOptions(mode="hmac", secret="..."))
Setup(root="./templates", signing=SignOptions(mode="ed25519", private_key="<64 hex chars>"))
Setup(root="./templates")  # mode="none": no signature
```

HMAC and Ed25519 raise `AnzaError` when their key is missing. See [crypto.md](crypto.md).

## Page Rendering

`Page(route, params)` maps the route to a template: `/` → `pages/home.html`,
`/about` → `pages/about.html`. The page is wrapped in open declarative shadow
DOM as `<page-about><template shadowrootmode="open">…</template></page-about>`
and inserted into `layout/shell.html` as `{{content}}` (also `{{main}}` and
`{{body}}`; `{{route}}` holds the route). The shell is required.

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
            yield format_event(envelope)   # "event: template\ndata: {...}\n\n"
            await asyncio.sleep(2)
    return StreamingResponse(events(), media_type="text/event-stream")
```

`Stream(template, slot, params).run(engine)` returns the same SSE text in one
call. See [streaming.md](streaming.md).

## Package Layout

| Package | Contents |
|---------|----------|
| `anza.data.input` | `Setup`, `Page`, `Fragment`, `Stream` |
| `anza.engine.slot` | `{{slot}}` parser (`extract`) and binder (`string`) |
| `anza.engine.file` | Template loading, reading and watching |
| `anza.engine.cache` | `Engine`, `SignOptions`, the template store |
| `anza.render` | `render_page`, `render_fragment` |
| `anza.crypto` | `hmac`, `ed25519`, `hkdf`, `digest` |
| `anza.stream` | `format_event` (SSE), `format_packet` (WebSocket) |
| `anza.adapters` | FastAPI, Flask, ASGI, WSGI helpers |
| `anza.models` | `Document`, `Envelope`, `Manifest` |
