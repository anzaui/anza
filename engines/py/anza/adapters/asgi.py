from typing import Any, Callable, Awaitable
from ..models.document import Document
from ..models.envelope import Envelope


async def send_html(send: Callable[[dict[str, Any]], Awaitable[None]], doc: Document, status: int = 200) -> None:
    body = doc.to_bytes()
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"text/html; charset=utf-8"),
                (b"content-length", str(len(body)).encode("ascii")),
            ],
        }
    )
    await send(
        {
            "type": "http.response.body",
            "body": body,
            "more_body": False,
        }
    )


async def send_json(send: Callable[[dict[str, Any]], Awaitable[None]], envelope: Envelope, status: int = 200) -> None:
    import json
    body = json.dumps(envelope.to_dict()).encode("utf-8")
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json; charset=utf-8"),
                (b"content-length", str(len(body)).encode("ascii")),
            ],
        }
    )
    await send(
        {
            "type": "http.response.body",
            "body": body,
            "more_body": False,
        }
    )
