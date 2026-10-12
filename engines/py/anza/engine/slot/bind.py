from typing import Any, Optional
from .escape import escape_html
from .parse import Chunk


def resolve_val(params: Any, key: str) -> Optional[str]:
    if params is None:
        return None

    if isinstance(params, dict):
        val = params.get(key)
        return str(val) if val is not None else None

    if isinstance(params, (list, tuple)):
        for item in params:
            if isinstance(item, (list, tuple)) and len(item) == 2 and item[0] == key:
                return str(item[1]) if item[1] is not None else None
        return None

    # Object / dataclass / model attribute. Private names and methods are
    # never read, so `{{__class__}}` or `{{__init__}}` render nothing.
    if not key.startswith("_"):
        val = getattr(params, key, None)
        if val is not None and not callable(val):
            return str(val)

    return None


def string(chunks: list[Chunk], params: Any = None, escape: bool = False) -> str:
    """Bind ``params`` into ``chunks``. With ``escape``, ``{{slot}}`` values
    are HTML-escaped; ``{{{raw}}}`` values never are."""
    parts: list[str] = []
    for chunk in chunks:
        if chunk.kind == "static":
            parts.append(chunk.value)
            continue
        val = resolve_val(params, chunk.value)
        if val is None:
            continue
        parts.append(escape_html(val) if escape and chunk.kind == "slot" else val)
    return "".join(parts)
