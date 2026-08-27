# Anza Python Engine

Anza is an ultra-fast, zero-dependency, cryptographically verified Server-Templated UI (STUI) engine for Python built 100% on the Python Standard Library.

## Features

- **0 External Runtime Dependencies**: Standard library implementation with zero mandatory pip dependencies.
- **Fast Slot Interpolation**: Pre-parsed template chunks with optimized string concatenation resolving parameters from dicts, dataclasses, and custom objects.
- **Dual-Mode Rendering**: Mode A full-page Open Declarative Shadow DOM shells and Mode B signed JSON envelopes.
- **Cryptographic Security**: HMAC-SHA256 with constant-time verification, RFC 8032 Ed25519 asymmetric origin signing, and HKDF stream key derivation.
- **Framework Adapters**: Direct ASGI, WSGI, FastAPI, and Flask response helpers.
- **Real-Time Streaming**: Atomic Server-Sent Events (SSE) and WebSocket frame generators.

## Installation

```bash
pip install anza
# or: uv add anza / poetry add anza
```

## Quick Start (FastAPI)

```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from anza import Setup, Page, Fragment, SignOptions

app = FastAPI()

engine = Setup(
    root="./templates",
    signing=SignOptions(mode="hmac", secret="secret-key-32-chars-long-12345!"),
).run()

@app.get("/", response_class=HTMLResponse)
def home():
    doc = Page("/", {"title": "Python STUI"}).run(engine)
    return HTMLResponse(doc.html)

@app.get("/card/{card_id}")
def card(card_id: str):
    env = Fragment("card.html", "feed", {"id": card_id, "title": "Live Post"}).run(engine)
    return JSONResponse(env.to_dict())
```

## License

MIT © 2026 Anza Contributors.
