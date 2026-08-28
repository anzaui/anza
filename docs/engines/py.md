# Python Engine

The Anza Python Engine (`anza`) is a pure standard library Server-Templated UI engine for the Python ecosystem. It runs on Python 3.9+ without external binary dependencies.

## What You Get

- **Zero external dependencies** — Built 100% on Python standard library modules (`hashlib`, `hmac`, `secrets`, `pathlib`)
- **Universal framework support** — Native adapters for FastAPI, Starlette, Flask, Django, ASGI, and WSGI
- **Dataclass & Pydantic binding** — Direct parameter injection from native Python objects and dictionaries
- **Async streaming generators** — Built-in event generators for high-concurrency Server-Sent Events (SSE)

## Installation

```bash
pip install anza
```

## Quickstart (FastAPI / ASGI)

```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from anza import Setup, Page, Fragment, SignOptions

# 1. Initialize engine at application startup
engine = (
    Setup("./templates")
    .with_signing(SignOptions.hmac("super-secret-key-32-bytes-long!"))
    .run()
)

app = FastAPI()

# Mode A: Full-Page SSR with Declarative Shadow DOM
@app.get("/", response_class=HTMLResponse)
async def home():
    doc = Page("/").with_param("title", "Anza Python STUI").run(engine)
    return doc.html

# Mode B: Dynamic Signed Fragment
@app.get("/card", response_class=JSONResponse)
async def card():
    envelope = (
        Fragment("feed/card.html", slot="feed")
        .with_param("title", "Live Python Card")
        .run(engine)
    )
    return envelope.to_dict()
```

## Flask Integration (WSGI)

```python
from flask import Flask, jsonify, Response
from anza import Setup, Page, Fragment

engine = Setup("./templates").run()
app = Flask(__name__)

@app.route("/")
def home():
    doc = Page("/").with_param("title", "Flask STUI").run(engine)
    return Response(doc.html, mimetype="text/html")

@app.route("/card")
def card():
    envelope = Fragment("feed/card.html", slot="feed").with_param("title", "Item").run(engine)
    return jsonify(envelope.to_dict())

if __name__ == "__main__":
    app.run(port=3000)
```

## Dataclass Binding

```python
from dataclasses import dataclass
from anza import Page

@dataclass
class UserProfile:
    user_id: str
    user_name: str
    role: str

profile = UserProfile(
    user_id="usr_102",
    user_name="Alice",
    role="Admin"
)

doc = Page("/profile").with_data(profile).run(engine)
```
