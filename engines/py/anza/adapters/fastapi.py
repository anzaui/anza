from typing import Any
from ..models.document import Document
from ..models.envelope import Envelope


def html_response(doc: Document, status_code: int = 200) -> Any:
    try:
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=doc.html, status_code=status_code)
    except ImportError:
        try:
            from starlette.responses import HTMLResponse
            return HTMLResponse(content=doc.html, status_code=status_code)
        except ImportError:
            return doc.html


def json_response(envelope: Envelope, status_code: int = 200) -> Any:
    try:
        from fastapi.responses import JSONResponse
        return JSONResponse(content=envelope.to_dict(), status_code=status_code)
    except ImportError:
        try:
            from starlette.responses import JSONResponse
            return JSONResponse(content=envelope.to_dict(), status_code=status_code)
        except ImportError:
            return envelope.to_dict()
