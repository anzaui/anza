from typing import Any, Optional
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

    # Object / Dataclass / Model attribute
    if hasattr(params, key):
        val = getattr(params, key)
        return str(val) if val is not None else None

    return None


def string(chunks: list[Chunk], params: Any = None) -> str:
    parts: list[str] = []

    if params is None:
        for chunk in chunks:
            if chunk.kind == "static":
                parts.append(chunk.value)
        return "".join(parts)

    if isinstance(params, dict):
        for chunk in chunks:
            if chunk.kind == "static":
                parts.append(chunk.value)
            else:
                val = params.get(chunk.value)
                if val is not None:
                    parts.append(str(val))
        return "".join(parts)

    # General parameter resolver
    for chunk in chunks:
        if chunk.kind == "static":
            parts.append(chunk.value)
        else:
            val = resolve_val(params, chunk.value)
            if val is not None:
                parts.append(val)

    return "".join(parts)
