from typing import Any
from ..models.document import Document
from ..models.envelope import Envelope


def html_response(doc: Document, status_code: int = 200) -> Any:
    try:
        from flask import Response
        return Response(doc.html, status=status_code, mimetype="text/html")
    except ImportError:
        return doc.html


def json_response(envelope: Envelope, status_code: int = 200) -> Any:
    try:
        from flask import jsonify
        resp = jsonify(envelope.to_dict())
        resp.status_code = status_code
        return resp
    except ImportError:
        return envelope.to_dict()
