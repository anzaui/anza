from typing import Any, Callable
from ..models.document import Document
from ..models.envelope import Envelope


def send_html(start_response: Callable[..., Any], doc: Document, status: str = "200 OK") -> list[bytes]:
    body = doc.to_bytes()
    headers = [
        ("Content-Type", "text/html; charset=utf-8"),
        ("Content-Length", str(len(body))),
    ]
    start_response(status, headers)
    return [body]


def send_json(start_response: Callable[..., Any], envelope: Envelope, status: str = "200 OK") -> list[bytes]:
    import json
    body = json.dumps(envelope.to_dict()).encode("utf-8")
    headers = [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(body))),
    ]
    start_response(status, headers)
    return [body]
