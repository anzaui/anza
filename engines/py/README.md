# Anza (Python Engine)

A zero-dependency template and dynamic fragment rendering library for Python web applications.

## What It Does

1. **Full-Page Rendering**: Renders full HTML pages with `<template shadowrootmode="open">` Declarative Shadow DOM shells.
2. **Dynamic Fragment Envelopes**: Renders targeted HTML partials inside JSON `Envelope` payloads for partial UI updates.
3. **Payload Signing**: Signs dynamic payloads with HMAC-SHA256 or Ed25519 so clients can verify partial updates.
4. **Streaming**: Helpers for Server-Sent Events (SSE) and WebSocket message formats.
5. **No Mandatory Dependencies**: Built entirely on the Python Standard Library.

## Installation

```bash
pip install anza
```

## Usage

### 1. Initialize Engine

```python
from anza import Setup, SignOptions

engine = Setup(
    root="./templates",
    signing=SignOptions(mode="hmac", secret="your-secret-key-at-least-32-chars-long"),
).run()
```

### 2. Render Full Pages

```python
from anza import Page

# Renders full HTML page with parameters interpolated into slots
doc = Page("/", {"title": "My Application"}).run(engine)
print(doc.html)
```

### 3. Render Signed JSON Fragments

```python
from anza import Fragment

# Renders a specific template fragment targeting a slot
envelope = Fragment("card.html", "feed", {"title": "New Post"}).run(engine)

# envelope contains: slot, html, ts, and signature
print(envelope.to_dict())
```

### 4. FastAPI Integration Example

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

## License

MIT © 2026 aduki, Labs
