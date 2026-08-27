# Python STUI Template Engine

The **Anza Python Engine** (`anza`) is an ultra-fast, **zero-dependency** template and STUI streaming engine built 100% on the Python Standard Library.

## Installation

```bash
pip install anza
# or: uv add anza / poetry add anza
```

## Quickstart (FastAPI)

```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from anza import Setup, Page, Fragment, SignOptions, format_event
import asyncio

app = FastAPI()

# 1. Initialize engine once at application startup
engine = Setup(
    root="./templates",
    signing=SignOptions(mode="hmac", secret="my-secret-key-32-chars-long!!"),
).run()

# 2. Full-Page SSR with Open Declarative Shadow DOM
@app.get("/", response_class=HTMLResponse)
async def home():
    doc = Page("/", {"title": "FastAPI STUI", "count": 42}).run(engine)
    return HTMLResponse(doc.html)

# 3. Dynamic Partial Fragment (Signed JSON Envelope)
@app.get("/card/{card_id}")
async def get_card(card_id: str):
    env = Fragment("feed/card.html", "feed", {"id": card_id, "title": "Live Post"}).run(engine)
    return JSONResponse(env.to_dict())

# 4. Live Server-Sent Events Stream
@app.get("/feed/stream")
async def stream_feed():
    async def event_generator():
        while True:
            env = Fragment("feed/card.html", "feed", {"title": "Live Stream Push"}).run(engine)
            yield format_event(env)
            await asyncio.sleep(2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

## Parameter Resolution

The Python engine resolves parameter slots from:
- Standard `dict` instances: `{"title": "Hello"}`
- `dataclasses`: `@dataclass class Article: ...`
- Pydantic models and objects with attribute lookups.
