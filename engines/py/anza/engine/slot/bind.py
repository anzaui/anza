import json
from typing import Any, Optional
from .escape import escape_html
from .parse import Chunk

_MAX_SAFE_INT = 2**53


def stringify(val: Any) -> Optional[str]:
    """A value as slot text (see ``docs/engines/contract.md``): strings as-is,
    ``true``/``false``, integers in decimal, integral floats without ``.0``,
    other floats via ``repr``, ``None`` as nothing, dicts/lists/tuples as
    compact JSON, anything else via ``str``."""
    if val is None:
        return None
    if isinstance(val, str):
        return val
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, int):
        return str(val)
    if isinstance(val, float):
        if val.is_integer() and abs(val) < _MAX_SAFE_INT:
            return str(int(val))
        return repr(val)
    if isinstance(val, (dict, list, tuple)):
        return json.dumps(val, separators=(",", ":"), ensure_ascii=False, default=str)
    return str(val)


def lookup(params: Any, key: str) -> Any:
    """The raw value of ``key`` in ``params`` (dict, ``(key, value)`` pairs, or
    an object's public, non-callable attribute)."""
    if params is None:
        return None
    if isinstance(params, dict):
        return params.get(key)
    if isinstance(params, (list, tuple)):
        for item in params:
            if isinstance(item, (list, tuple)) and len(item) == 2 and item[0] == key:
                return item[1]
        return None
    # Object / dataclass / model attribute. Private names and methods are
    # never read, so `{{__class__}}` or `{{__init__}}` render nothing.
    if key.startswith("_"):
        return None
    val = getattr(params, key, None)
    return None if callable(val) else val


def resolve_val(params: Any, key: str) -> Optional[str]:
    return stringify(lookup(params, key))


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
